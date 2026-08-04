import "server-only"

import { cache } from "react"
import { prisma } from "@/lib/prisma"
import { PHYSICAL_QR, type PlanQuotas } from "@/lib/plan-quotas"

export type { PlanQuotas } from "@/lib/plan-quotas"

// Field names match PlanQuotas 1:1 — selecting this shape off a Subscription
// row IS a PlanQuotas object, no mapping needed.
const QUOTA_SELECT = {
  code:                  true,
  treeMaxMembers:        true,
  bioMaxChars:           true,
  mediaMaxImages:        true,
  mediaMaxVideos:        true,
  documentsMax:          true,
  geoPlacesMax:          true,
  memorialsMax:          true,
  petsMax:               true,
  qrCodeMax:             true,
  geolocationFullAccess: true,
} as const

// Cached per request — the FREE plan's own quotas, looked up once instead of
// re-querying for every profile that falls through to the free default.
const getFreeQuotas = cache(async (): Promise<PlanQuotas> => {
  const free = await prisma.subscription.findUnique({ where: { code: "FREE" }, select: QUOTA_SELECT })
  if (!free) throw new Error("FREE subscription row not found")
  return free
})

// Shared "is this specific AppSale row currently in its paid period"
// predicate — used both for a memorial's own directly-assigned legacy slot
// (below) and, in qr-quota.ts, to bypass the QR rank heuristic for a profile
// that already has its own dedicated paid slot.
export function isSaleLive(sale: { status: string | null; currentPeriodEnd: Date | null } | null | undefined): boolean {
  if (!sale) return false
  const now = new Date()
  return (sale.status === "active" || sale.status === "trialing") && !!sale.currentPeriodEnd && sale.currentPeriodEnd > now
}

/**
 * Resolves the plan quotas for a given profile.
 *
 * Living profile (APP_USER): physicalQrLicense > own live paid AppSale > FREE.
 *
 * Memorial (APP_MEMO) or pet (APP_PET) profile: physicalQrLicense > any
 * ACCEPTED guardian's own live paid AppSale (cascades — one guardian's
 * subscription covers every memorial/pet they manage; if guardians are on
 * different tiers, the highest-priced plan's quotas win — deterministic
 * tie-break, unreachable today with only FREE/PREMIUM but real once a third
 * paid tier exists) > a legacy AppSale assigned directly to this profile
 * (preserves bulk-slot sales already made through BMS/SEQ) > FREE. Pets have
 * no physicalQrLicense/QR concept of their own in practice, but the branch is
 * role-based so it costs nothing to leave that check in place.
 *
 * Cached per (profileId, request) so repeated callers share the same lookups.
 */
export const getMemorialFeatures = cache(async (profileId: string): Promise<PlanQuotas> => {
  const profile = await prisma.appUser.findUnique({
    where: { id: profileId },
    select: {
      role:              true,
      physicalQrLicense: { select: { id: true } },
      appSale:           { select: { status: true, currentPeriodEnd: true, subscription: { select: QUOTA_SELECT } } },
    },
  })

  if (profile?.physicalQrLicense) return PHYSICAL_QR

  if (profile?.role === "APP_MEMO" || profile?.role === "APP_PET") {
    const guardians = await prisma.appUserGuardian.findMany({
      where:  { appUserId: profileId, status: "ACCEPTED" },
      select: { guardianId: true },
    })

    if (guardians.length > 0) {
      const liveSales = await prisma.appSale.findMany({
        where: {
          appUserId:        { in: guardians.map((g) => g.guardianId) },
          status:           { in: ["active", "trialing"] },
          currentPeriodEnd: { gt: new Date() },
        },
        select: { subscription: { select: { ...QUOTA_SELECT, priceUsd: true } } },
      })
      if (liveSales.length > 0) {
        const richest = liveSales.reduce((best, s) =>
          Number(s.subscription.priceUsd) > Number(best.subscription.priceUsd) ? s : best)
        return {
          code:                  richest.subscription.code,
          treeMaxMembers:        richest.subscription.treeMaxMembers,
          bioMaxChars:           richest.subscription.bioMaxChars,
          mediaMaxImages:        richest.subscription.mediaMaxImages,
          mediaMaxVideos:        richest.subscription.mediaMaxVideos,
          documentsMax:          richest.subscription.documentsMax,
          geoPlacesMax:          richest.subscription.geoPlacesMax,
          memorialsMax:          richest.subscription.memorialsMax,
          petsMax:               richest.subscription.petsMax,
          qrCodeMax:             richest.subscription.qrCodeMax,
          geolocationFullAccess: richest.subscription.geolocationFullAccess,
        }
      }
    }

    if (isSaleLive(profile.appSale) && profile.appSale?.subscription) return profile.appSale.subscription

    return getFreeQuotas()
  }

  const sale = await prisma.appSale.findFirst({
    where: {
      appUserId:        profileId,
      status:           { in: ["active", "trialing"] },
      currentPeriodEnd: { gt: new Date() },
    },
    orderBy: { currentPeriodEnd: "desc" },
    select:  { subscription: { select: QUOTA_SELECT } },
  })
  if (sale) return sale.subscription

  return getFreeQuotas()
})
