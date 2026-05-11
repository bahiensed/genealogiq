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
 * Resolves the feature limits for a given memorial:
 * - if the memorial has appSaleId → return its sale's subscription features
 * - else → return the FREE-tier features
 *
 * Cached per (memorialId, request) so multiple components asking on the same
 * render share one DB hit.
 */
export const getMemorialFeatures = cache(async (memorialId: string): Promise<SubscriptionFeatures> => {
  const memorial = await prisma.appUser.findUnique({
    where: { id: memorialId },
    select: {
      appSale: {
        select: {
          subscription: { select: FEATURE_SELECT },
        },
      },
    },
  })

  if (memorial?.appSale?.subscription) return memorial.appSale.subscription
  return getFreeSubscription()
})
