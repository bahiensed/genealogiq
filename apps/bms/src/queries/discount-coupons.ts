import 'server-only'

import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'

export async function getDiscountCoupons() {
  await verifySession()

  return prisma.discountCoupon.findMany({
    select: {
      id:             true,
      code:           true,
      description:    true,
      discountType:   true,
      discountValue:  true,
      duration:       true,
      durationInMonths: true,
      maxRedemptions: true,
      redeemBy:       true,
      isActive:       true,
      createdAt:      true,
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getDiscountCoupon(id: string) {
  await verifySession()

  const coupon = await prisma.discountCoupon.findUnique({
    where: { id },
    select: {
      id:                    true,
      code:                  true,
      description:           true,
      discountType:          true,
      discountValue:         true,
      duration:              true,
      durationInMonths:      true,
      maxRedemptions:        true,
      redeemBy:              true,
      isActive:              true,
      stripeCouponId:        true,
      stripePromotionCodeId: true,
      appliesTo:             { select: { id: true, name: true } },
      createdAt:             true,
    },
  })
  return coupon
}

export async function getActivePackagesForSelect() {
  await verifySession()

  return prisma.package.findMany({
    where:   { isActive: true, price: { gt: 0 } },
    orderBy: { price: 'asc' },
    select:  { id: true, name: true, price: true, quantity: true, stripeProductId: true },
  })
}

/**
 * Coupons an operator may legitimately attach to a sale, with the products each
 * one is restricted to. The form filters by the selected product client-side —
 * the whole set is a handful of rows, so a round trip per product change would
 * buy a spinner and nothing else.
 *
 * Three filters, and only the first is obvious:
 *
 * - `isActive` — the operator's own on/off switch.
 * - `stripePromotionCodeId` present — the discount is enforced by Stripe, not by
 *   us. A row without one is a coupon we failed to mirror, and attaching it
 *   would silently charge full price.
 * - `redeemBy` unset or still in the future. This matters more than it looks:
 *   the coupon list renders a green "active" badge off `isActive` alone and
 *   never reconciles it against the expiry date, so an expired coupon looks
 *   perfectly usable there. Stripe would reject it at checkout.
 *
 * An empty `packageIds` means every product — that is how createDiscountCoupon
 * writes it, sending Stripe an `applies_to` only when the list is non-empty.
 *
 * This is a convenience for the form, never an authority: createSalePaymentLink
 * re-resolves the coupon server-side, because a page left open can offer one
 * that has since expired.
 */
export async function getSelectableCoupons() {
  await verifySession()

  const rows = await prisma.discountCoupon.findMany({
    where: {
      isActive:              true,
      stripePromotionCodeId: { not: null },
      OR: [{ redeemBy: null }, { redeemBy: { gt: new Date() } }],
    },
    select: {
      id:            true,
      code:          true,
      discountType:  true,
      discountValue: true,
      appliesTo:     { select: { id: true } },
    },
    orderBy: { code: 'asc' },
  })

  return rows.map((c) => ({
    id:            c.id,
    code:          c.code,
    discountType:  c.discountType,
    discountValue: Number(c.discountValue),
    packageIds:    c.appliesTo.map((p) => p.id),
  }))
}
