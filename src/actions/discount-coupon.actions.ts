'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'
import { discountCouponSchema, type DiscountCouponFormValues } from '@/schemas/discount-coupon.schema'
// NOTE: stripe is imported lazily inside each action below — see comment in createDiscountCoupon.

type ActionError   = { error: string }
type ActionSuccess = { success: string }
type CreateSuccess = { success: string; coupon: { id: string; code: string } }

export async function createDiscountCoupon(data: DiscountCouponFormValues): Promise<ActionError | CreateSuccess> {
  const session = await verifySession()

  const validated = discountCouponSchema.safeParse(data)
  if (!validated.success) return { error: 'Invalid data' }
  const input = validated.data

  // Pre-flight 1: the code must be free in our DB
  const dbDup = await prisma.discountCoupon.findFirst({
    where:  { code: input.code },
    select: { id: true },
  })
  if (dbDup) return { error: 'A coupon with this code already exists.' }

  // Resolve Subscription ids → Stripe Product ids for Stripe's applies_to (if any specified)
  let stripeProductIds: string[] = []
  if (input.appliesTo.length > 0) {
    const subs = await prisma.subscription.findMany({
      where:  { id: { in: input.appliesTo } },
      select: { stripeProductId: true },
    })
    stripeProductIds = subs.map((s) => s.stripeProductId).filter((id): id is string => !!id)
  }

  // Dynamic import so the action module never forces stripe.ts to load at
  // module-init time — only when this action is actually invoked.
  const { stripe } = await import('@/lib/stripe')

  // Pre-flight 2: the code must be free on Stripe too (catches orphans from
  // earlier failed runs — without this the user gets stuck unable to use a
  // code that doesn't exist in our DB).
  const stripeDup = await stripe.promotionCodes.list({ code: input.code, active: true, limit: 1 })
  if (stripeDup.data.length > 0) {
    return { error: `Code "${input.code}" is already active in Stripe (orphan from a failed previous run). Ask an admin to clean it up.` }
  }

  let stripeCoupon: Awaited<ReturnType<typeof stripe.coupons.create>> | null = null
  let promo:        Awaited<ReturnType<typeof stripe.promotionCodes.create>> | null = null

  try {
    // 1. Create Stripe Coupon
    stripeCoupon = await stripe.coupons.create({
      percent_off:        input.discountType === 'percent' ? input.discountValue : undefined,
      amount_off:         input.discountType === 'amount'  ? Math.round(input.discountValue * 100) : undefined,
      currency:           input.discountType === 'amount'  ? 'usd' : undefined,
      duration:           input.duration,
      duration_in_months: input.duration === 'repeating' ? (input.durationInMonths ?? undefined) : undefined,
      applies_to:         stripeProductIds.length > 0 ? { products: stripeProductIds } : undefined,
    })

    // 2. Create Stripe Promotion Code (the customer-facing string)
    promo = await stripe.promotionCodes.create({
      promotion:       { type: 'coupon', coupon: stripeCoupon.id },
      code:            input.code,
      max_redemptions: input.maxRedemptions ?? undefined,
      expires_at:      input.redeemBy ? Math.floor(input.redeemBy.getTime() / 1000) : undefined,
    })

    // 3. Persist mirror in DB
    const created = await prisma.discountCoupon.create({
      data: {
        code:                  input.code,
        description:           input.description ?? null,
        discountType:          input.discountType,
        discountValue:         input.discountValue,
        duration:              input.duration,
        durationInMonths:      input.duration === 'repeating' ? input.durationInMonths : null,
        maxRedemptions:        input.maxRedemptions ?? null,
        redeemBy:              input.redeemBy ?? null,
        appliesTo:             input.appliesTo.length > 0
          ? { connect: input.appliesTo.map((id) => ({ id })) }
          : undefined,
        stripeCouponId:        stripeCoupon.id,
        stripePromotionCodeId: promo.id,
        createdById:           session.user.id,
      },
      select: { id: true, code: true },
    })

    revalidatePath('/sales/discount-coupons')
    return { success: 'Coupon created successfully.', coupon: created }
  } catch (e) {
    // Roll back anything we created on Stripe so we don't leak orphans.
    if (promo) {
      try { await stripe.promotionCodes.update(promo.id, { active: false }) } catch {}
    }
    if (stripeCoupon) {
      try { await stripe.coupons.del(stripeCoupon.id) } catch {}
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { error: 'A coupon with this code already exists.' }
    }
    console.error('[discount-coupon] create failed', e)
    return { error: (e as Error).message ?? 'Could not create coupon.' }
  }
}

/**
 * Updates the only safely-editable field on a coupon: the internal `description`.
 * Stripe Coupons and Promotion Codes are immutable for every commercially
 * meaningful attribute (percent_off, amount_off, duration, max_redemptions,
 * expires_at). Touching those would desync our DB from Stripe enforcement, so
 * we don't expose them. To change terms in practice: deactivate this coupon
 * and create a new one.
 */
export async function updateDiscountCoupon(
  id: string,
  data: { description: string | null },
): Promise<ActionError | ActionSuccess> {
  await verifySession()

  const coupon = await prisma.discountCoupon.findUnique({ where: { id }, select: { id: true } })
  if (!coupon) return { error: 'Coupon not found.' }

  try {
    await prisma.discountCoupon.update({
      where: { id },
      data:  { description: data.description },
    })
  } catch (e) {
    console.error('[discount-coupon] update failed', e)
    return { error: (e as Error).message ?? 'Could not update coupon.' }
  }

  revalidatePath('/sales/discount-coupons')
  revalidatePath(`/sales/discount-coupons/${id}`)
  return { success: 'Description updated.' }
}

export async function toggleDiscountCouponActive(id: string): Promise<ActionError | ActionSuccess> {
  await verifySession()

  const coupon = await prisma.discountCoupon.findUnique({
    where:  { id },
    select: { isActive: true, stripePromotionCodeId: true },
  })
  if (!coupon) return { error: 'Coupon not found.' }

  const nextActive = !coupon.isActive

  try {
    const { stripe } = await import('@/lib/stripe')
    // Mirror the active flag onto the Stripe Promotion Code so checkout enforcement stays in sync.
    if (coupon.stripePromotionCodeId) {
      await stripe.promotionCodes.update(coupon.stripePromotionCodeId, { active: nextActive })
    }
    await prisma.discountCoupon.update({ where: { id }, data: { isActive: nextActive } })
  } catch (e) {
    console.error('[discount-coupon] toggle failed', e)
    return { error: (e as Error).message ?? 'Could not update coupon.' }
  }

  revalidatePath('/sales/discount-coupons')
  return { success: nextActive ? 'Coupon reactivated.' : 'Coupon deactivated.' }
}
