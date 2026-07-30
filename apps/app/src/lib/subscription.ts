import "server-only"

import { cache } from "react"
import { prisma } from "@/lib/prisma"
import { FREE, PREMIUM, PHYSICAL_QR, type PlanQuotas } from "@/lib/plan-quotas"

export type { PlanQuotas } from "@/lib/plan-quotas"

// Does this profile itself have a live AppSale as the BUYER — the only DB
// signal getMemorialFeatures still needs. Which Subscription row/code that
// sale references no longer matters: any live paid sale maps uniformly to
// the local PREMIUM config (plan-quotas.ts) — BMS can rename/reprice/retire
// its own Subscription rows without this ever needing to change.
async function hasLivePaidSale(profileId: string): Promise<boolean> {
  const now = new Date()
  const sale = await prisma.appSale.findFirst({
    where: {
      appUserId:        profileId,
      status:           { in: ["active", "trialing"] },
      currentPeriodEnd: { gt: now },
    },
    select: { id: true },
  })
  return !!sale
}

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
 * subscription covers every memorial/pet they manage) > a legacy AppSale
 * assigned directly to this profile (preserves bulk-slot sales already made
 * through BMS/SEQ) > FREE. Pets have no physicalQrLicense/QR concept of
 * their own in practice, but the branch is role-based so it costs nothing to
 * leave that check in place.
 *
 * Cached per (profileId, request) so repeated callers share the same lookups.
 */
export const getMemorialFeatures = cache(async (profileId: string): Promise<PlanQuotas> => {
  const profile = await prisma.appUser.findUnique({
    where: { id: profileId },
    select: {
      role:              true,
      physicalQrLicense: { select: { id: true } },
      appSale:           { select: { status: true, currentPeriodEnd: true } },
    },
  })

  if (profile?.physicalQrLicense) return PHYSICAL_QR

  if (profile?.role === "APP_MEMO" || profile?.role === "APP_PET") {
    const guardians = await prisma.appUserGuardian.findMany({
      where:  { appUserId: profileId, status: "ACCEPTED" },
      select: { guardianId: true },
    })
    const guardiansPaying = await Promise.all(guardians.map((g) => hasLivePaidSale(g.guardianId)))
    if (guardiansPaying.some(Boolean)) return PREMIUM

    if (isSaleLive(profile.appSale)) return PREMIUM

    return FREE
  }

  if (await hasLivePaidSale(profileId)) return PREMIUM
  return FREE
})
