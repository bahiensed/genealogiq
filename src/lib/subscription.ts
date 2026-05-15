import "server-only"

import { cache } from "react"
import { prisma } from "@/lib/prisma"

export interface SubscriptionFeatures {
  code: string
  treeMaxMembers: number
  bioMaxChars: number
  bioMaxImages: number
  galleryMaxImages: number
  galleryMaxVideos: number
  geolocationFullAccess: boolean
  qrCodeAccess: boolean
}

const FEATURE_SELECT = {
  code:                  true,
  treeMaxMembers:        true,
  bioMaxChars:           true,
  bioMaxImages:          true,
  galleryMaxImages:      true,
  galleryMaxVideos:      true,
  geolocationFullAccess: true,
  qrCodeAccess:          true,
} as const

const FREE_FALLBACK: SubscriptionFeatures = {
  code: "FREE",
  treeMaxMembers: 5,
  bioMaxChars: 2000,
  bioMaxImages: 3,
  galleryMaxImages: 10,
  galleryMaxVideos: 2,
  geolocationFullAccess: false,
  qrCodeAccess: false,
}

/**
 * Returns the FREE-tier features, cached per request via React.cache().
 * Falls back to a hardcoded shape only if the FREE row is missing from the DB
 * (should never happen — seeded by migration).
 */
export const getFreeSubscription = cache(async (): Promise<SubscriptionFeatures> => {
  const row = await prisma.subscription.findUnique({
    where: { code: "FREE" },
    select: FEATURE_SELECT,
  })
  return row ?? FREE_FALLBACK
})

/**
 * Resolves the feature limits for a given profile:
 *   1. If the profile is a memorial assigned to a live AppSale (appSaleId set)
 *      → use that sale's subscription features.
 *   2. Else if the profile itself is the buyer of any live AppSale
 *      (i.e. this is an active user's own profile, not a memorial)
 *      → use that buyer's highest-tier active plan.
 *   3. Else → FREE tier.
 *
 * Cached per (profileId, request) so repeated callers share a single DB hit.
 */
export const getMemorialFeatures = cache(async (profileId: string): Promise<SubscriptionFeatures> => {
  const now = new Date()

  // 1. Direct memorial assignment via appSaleId
  const profile = await prisma.appUser.findUnique({
    where: { id: profileId },
    select: {
      appSale: {
        select: {
          status:           true,
          currentPeriodEnd: true,
          subscription:     { select: FEATURE_SELECT },
        },
      },
    },
  })

  const assignedSale = profile?.appSale
  const assignedIsLive =
    !!assignedSale &&
    (assignedSale.status === "active" || assignedSale.status === "trialing") &&
    assignedSale.currentPeriodEnd > now

  if (assignedIsLive && assignedSale.subscription) return assignedSale.subscription

  // 2. Buyer-side: this user owns a live subscription (their own active profile)
  const buyerSale = await prisma.appSale.findFirst({
    where: {
      appUserId:        profileId,
      status:           { in: ["active", "trialing"] },
      currentPeriodEnd: { gt: now },
    },
    // Highest tier wins when multiple — sort by subscription.price desc.
    orderBy: { subscription: { price: "desc" } },
    select:  { subscription: { select: FEATURE_SELECT } },
  })

  if (buyerSale?.subscription) return buyerSale.subscription

  // 3. Fall back to FREE
  return getFreeSubscription()
})
