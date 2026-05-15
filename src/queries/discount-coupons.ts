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
      appliesTo:             { select: { id: true, name: true, code: true } },
      createdAt:             true,
    },
  })
  return coupon
}

export async function getPaidSubscriptionsForSelect() {
  await verifySession()

  return prisma.subscription.findMany({
    where:   { isActive: true, price: { gt: 0 } },
    orderBy: { price: 'asc' },
    select:  { id: true, name: true, code: true, stripeProductId: true },
  })
}
