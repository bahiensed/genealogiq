
import 'server-only'

import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'
import type { AppCurrency } from '@genealogiq/core'

export async function getDiscountCoupons() {
  await verifySession()

  return prisma.discountCoupon.findMany({
    select: {
      id:             true,
      code:           true,
      description:    true,
      discountType:   true,
      percentOff:     true,
      amountOffUsd:   true,
      amountOffBrl:   true,
      amountOffMxn:   true,
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
      percentOff:            true,
      amountOffUsd:          true,
      amountOffBrl:          true,
      amountOffMxn:          true,
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

const PRICE_BY_CURRENCY = { usd: 'priceUsd', brl: 'priceBrl', mxn: 'priceMxn' } as const

/**
 * Products a coupon can be restricted to, priced in the operator's currency.
 *
 * Restriction is by Stripe PRODUCT, which is one object across all currencies —
 * so a coupon limited to GenCode covers it in every currency it sells in. The
 * price shown here is only a label to help the operator recognise the row.
 */
export async function getActivePackagesForSelect(currency: AppCurrency) {
  await verifySession()

  const rows = await prisma.package.findMany({
    where:   { isActive: true, [PRICE_BY_CURRENCY[currency]]: { gt: 0 } },
    orderBy: { [PRICE_BY_CURRENCY[currency]]: 'asc' },
    select:  { id: true, name: true, quantity: true, stripeProductId: true,
               priceUsd: true, priceBrl: true, priceMxn: true },
  })

  return rows.map((r) => ({
    id:              r.id,
    name:            r.name,
    quantity:        r.quantity,
    stripeProductId: r.stripeProductId,
    price:           Number(r[PRICE_BY_CURRENCY[currency]]),
  }))
}

/**
 * Coupons an operator may legitimately attach to a sale, with the products each
 * one is restricted to. The form filters by the selected product client-side —
 * the whole set is a handful of rows, so a round trip per product change would
 * buy a spinner and nothing else.
 *
 * Four filters, and only the first is obvious:
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
 * - the currency the sale is being made in. A percentage has none and always
 *   qualifies; a fixed amount only appears where it has a value, because Stripe
 *   would refuse it otherwise. This is Douglas's rule — a coupon in Portuguese
 *   is a coupon in reais — falling out of the data rather than being enforced
 *   separately.
 *
 * An empty `packageIds` means every product — that is how createDiscountCoupon
 * writes it, sending Stripe an `applies_to` only when the list is non-empty.
 *
 * This is a convenience for the form, never an authority: createSalePaymentLink
 * re-resolves the coupon server-side, because a page left open can offer one
 * that has since expired.
 */
export async function getSelectableCoupons(currency: AppCurrency) {
  await verifySession()

  const AMOUNT_BY_CURRENCY = { usd: 'amountOffUsd', brl: 'amountOffBrl', mxn: 'amountOffMxn' } as const

  const rows = await prisma.discountCoupon.findMany({
    where: {
      isActive:              true,
      stripePromotionCodeId: { not: null },
      OR: [{ redeemBy: null }, { redeemBy: { gt: new Date() } }],
      // Douglas's rule: a coupon in Portuguese is a coupon in reais. A
      // percentage has no currency and is always eligible; a fixed amount is
      // only offered where it has a value, because Stripe would refuse it.
      AND: [{ OR: [
        { discountType: 'percent' },
        { [AMOUNT_BY_CURRENCY[currency]]: { gt: 0 } },
      ] }],
    },
    select: {
      id:            true,
      code:          true,
      discountType:  true,
      percentOff:    true,
      amountOffUsd:  true,
      amountOffBrl:  true,
      amountOffMxn:  true,
      appliesTo:     { select: { id: true } },
    },
    orderBy: { code: 'asc' },
  })

  return rows.map((c) => ({
    id:           c.id,
    code:         c.code,
    discountType: c.discountType,
    // One number, already resolved for this currency — the form never has to
    // know which of the four columns applies.
    value: c.discountType === 'percent'
      ? Number(c.percentOff ?? 0)
      : Number(c[AMOUNT_BY_CURRENCY[currency]] ?? 0),
    packageIds: c.appliesTo.map((p) => p.id),
  }))
}
