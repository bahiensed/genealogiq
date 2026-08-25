'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { Prisma } from '@genealogiq/db'
import { done, fail, type ActionResult } from '@genealogiq/core'
import { prisma } from '@/lib/prisma'
import { verifyAdmin, requireRole } from '@/lib/dal'
import { getSaleSchema, type SaleFormValues } from '@/schemas/sale.schema'
import { identityTranslator } from '@/schemas/i18n'
import { stripe } from '@/lib/stripe'
import { ensureTenantStripeCustomer } from '@genealogiq/services/stripe-customer'
import { sendSalePaymentLinkEmail } from '@/lib/email'
import { BMS_ORIGIN, settleSaleManually } from '@/lib/billing'

/** Stripe's ceiling for a Checkout Session is 30 days; a week is long enough to chase. */
const LINK_TTL_DAYS = 7

/**
 * Opens a Stripe Checkout Session for a B2B order and emails the tenant the link.
 *
 * The sale is written BEFORE the session exists, deliberately: it is the row the
 * webhook later finds by session id, and it is what puts the order on the list as
 * "awaiting payment" the moment the operator hits the button. No GenCode is minted
 * here — codes are what payment buys, and a link nobody pays must leave nothing
 * behind.
 */
export async function createSalePaymentLink(data: SaleFormValues): Promise<ActionResult> {
  const session = await verifyAdmin()
  const t = await getTranslations('Actions')

  const validated = getSaleSchema(identityTranslator).safeParse(data)
  if (!validated.success) return fail(t('common.invalidData'))

  const { packageId, tenantId, quantity, discountCouponId } = validated.data

  const pkg = await prisma.package.findUnique({
    where:  { id: packageId },
    select: { name: true, quantity: true, price: true, isActive: true, stripePriceId: true },
  })
  if (!pkg) return fail(t('sale.packageNotFound'))
  if (!pkg.isActive) return fail(t('sale.packageInactive'))
  // Without a synced Price there is nothing to charge for. SEQ guards the same
  // way; before payment links, BMS could sell an unsynced product happily
  // because no money ever changed hands.
  if (!pkg.stripePriceId) return fail(t('sale.packageNotSynced'))

  const tenant = await prisma.tenant.findUnique({
    where:  { id: tenantId },
    select: { email: true, name: true, tradeName: true, isActive: true },
  })
  if (!tenant) return fail(t('sale.tenantNotFound'))
  if (!tenant.isActive) return fail(t('sale.tenantInactive'))

  // Re-resolve the coupon server-side. The select is a convenience, not an
  // authority: a stale page could offer one that has since expired.
  let promotionCodeId: string | null = null
  if (discountCouponId) {
    const coupon = await prisma.discountCoupon.findFirst({
      where: {
        id:                    discountCouponId,
        isActive:              true,
        stripePromotionCodeId: { not: null },
        OR: [{ redeemBy: null }, { redeemBy: { gt: new Date() } }],
        AND: [{ OR: [{ appliesTo: { none: {} } }, { appliesTo: { some: { id: packageId } } }] }],
      },
      select: { stripePromotionCodeId: true },
    })
    if (!coupon) return fail(t('sale.couponNotApplicable'))
    promotionCodeId = coupon.stripePromotionCodeId
  }

  const customer  = await ensureTenantStripeCustomer(tenantId)
  const baseUrl   = process.env.BMS_URL ?? 'http://localhost:3000'
  const expiresAt = new Date(Date.now() + LINK_TTL_DAYS * 24 * 60 * 60 * 1000)

  const sale = await prisma.sale.create({
    data: {
      packageId,
      tenantId,
      quantity,
      soldById: session.user!.id,
      discountCouponId: discountCouponId || null,
    },
    select: { id: true },
  })

  try {
    const metadata = {
      origin:    BMS_ORIGIN,
      saleId:    String(sale.id),
      tenantId,
      packageId,
      quantity:  String(quantity),
      soldById:  session.user!.id,
    }

    const checkout = await stripe.checkout.sessions.create({
      mode:                'payment',
      customer,
      line_items:          [{ price: pkg.stripePriceId, quantity }],
      client_reference_id: tenantId,
      metadata,
      payment_intent_data: { metadata },
      expires_at:          Math.floor(expiresAt.getTime() / 1000),
      success_url:         `${baseUrl}/sales/manual-sales?status=success`,
      cancel_url:          `${baseUrl}/sales/manual-sales?status=cancel`,
      // Mutually exclusive in the Stripe API: sending both is a 400. A coupon the
      // operator chose is applied for the buyer; with none, the buyer may type
      // their own on Stripe's page.
      ...(promotionCodeId
        ? { discounts: [{ promotion_code: promotionCodeId }] }
        : { allow_promotion_codes: true }),
    })

    if (!checkout.url) throw new Error('Stripe returned a session with no URL')

    await prisma.sale.update({
      where: { id: sale.id },
      data: {
        stripeSessionId: checkout.id,
        checkoutUrl:     checkout.url,
        amountSubtotal:  checkout.amount_subtotal,
        amountTotal:     checkout.amount_total,
        currency:        checkout.currency,
      },
    })

    await sendSalePaymentLinkEmail({
      to:          tenant.email,
      url:         checkout.url,
      tenantName:  tenant.tradeName || tenant.name,
      productName: pkg.name,
      quantity,
      amount:      formatAmount(checkout.amount_total, checkout.currency, pkg.price, quantity),
      expiresAt,
    })
  } catch (e) {
    // The sale only means something as the counterpart of a live session. With
    // no link it is an order nobody can pay and nobody can see the state of, so
    // it goes rather than lingering as a permanent "awaiting payment".
    await prisma.sale.delete({ where: { id: sale.id } }).catch(() => {})
    const message = e instanceof Error ? e.message : t('sale.unknownError')
    return fail(t('sale.linkFailed', { message }))
  }

  revalidatePath('/sales/manual-sales')
  return done(t('sale.linkSent', { email: tenant.email }))
}

/**
 * Falls back to quantity x price only when Stripe reports no total — which it
 * does for a session whose amount depends on what the buyer picks on the page.
 */
function formatAmount(
  amountTotal: number | null,
  currency:    string | null,
  unitPrice:   Prisma.Decimal,
  quantity:    number,
): string {
  const value = amountTotal !== null ? amountTotal / 100 : Number(unitPrice) * quantity
  return new Intl.NumberFormat('pt-BR', {
    style:    'currency',
    currency: (currency ?? 'usd').toUpperCase(),
  }).format(value)
}

/**
 * Records a sale paid outside Stripe — a transfer, a PIX, a deposit.
 *
 * The escape hatch for the case the old flow was built entirely around: before
 * payment links, EVERY sale was recorded on the operator's word that money had
 * arrived. That is now the exception rather than the rule, and unlike before it
 * leaves a trace — paidById records who vouched for it, and a sale Stripe
 * settled leaves that column null.
 *
 * Narrower than verifyAdmin: an ADMIN can generate links all day, but asserting
 * that money arrived when Stripe never saw it is an owner's call.
 */
export async function markSalePaidManually(id: number): Promise<ActionResult> {
  // requireRole, not verifyAdmin: ADMIN may generate links all day, but
  // asserting money arrived when Stripe never saw it is an owner's call. It
  // 403s rather than returning a failure, which is right — the row action is
  // only rendered for those two roles, so reaching here means a forged request.
  const session = await requireRole('SUPER_ADMIN', 'OWNER')
  const t = await getTranslations('Actions')

  const sale = await prisma.sale.findUnique({
    where:  { id },
    select: { paidAt: true, reversedAt: true },
  })
  if (!sale) return fail(t('sale.notFound'))
  if (sale.reversedAt) return fail(t('sale.alreadyReversed'))
  if (sale.paidAt) return fail(t('sale.alreadyPaid'))

  await settleSaleManually(id, session.user!.id)

  revalidatePath('/sales/manual-sales')
  revalidatePath('/gencodes')
  return done(t('sale.markedPaid'))
}

export async function reverseSale(id: number): Promise<ActionResult> {
  await verifyAdmin()
  const t = await getTranslations('Actions')

  const sale = await prisma.sale.findUnique({
    where:  { id },
    select: {
      quantity:   true,
      tenantId:   true,
      reversedAt: true,
      package:    { select: { quantity: true } },
    },
  })
  if (!sale) return fail(t('sale.notFound'))
  if (sale.reversedAt) return fail(t('sale.alreadyReversed'))

  try {
    await prisma.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id },
        data:  { reversedAt: new Date() },
      })

      // Delete only AVAILABLE licenses. SOLD ones were written off by the
      // tenant and ACTIVATED ones are linked to a memorial — reversing the B2B
      // sale must not reach into either.
      await tx.genCode.deleteMany({
        where: { saleId: id, status: 'AVAILABLE' },
      })
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return fail(t('sale.notFound'))
    }
    throw e
  }

  revalidatePath('/sales/manual-sales')
  revalidatePath('/gencodes')
  return done()
}
