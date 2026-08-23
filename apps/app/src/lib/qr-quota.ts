import { prisma } from "@/lib/prisma"
import { getMemorialFeatures } from "@/lib/subscription"
import { getExtraUnits } from "@/lib/extra-units"

export interface QrQuotaStatus {
  // Is THIS specific profile's QR one of the guardian's free ones — OR does
  // it already have its own dedicated paid slot (see hasOwnUnlock below).
  unlocked: boolean
  // 1-indexed position of this profile in the guardian's creation-ordered
  // {own profile} ∪ {guarded memorials} set.
  rank: number
  limit: number
}

// There's no persisted "is this QR unlocked" flag anywhere today — account-
// level QR access has always been a binary, per-profile thing (a redeemed
// genCode), never a count. This ranks a guardian's own profile plus every
// memorial they manage (ACCEPTED) by creation order, live, with no schema
// change: the first `qrCodeMax` of them are free. Documented as an initial
// approximation — if "which QR counts as one of the free ones" ever needs to
// be a deliberate, sticky choice rather than always-oldest-first, that needs
// a persisted flag (a later migration), not this heuristic.
export async function getQrQuotaStatus(guardianId: string, profileId: string): Promise<QrQuotaStatus> {
  const [guardian, memorials, features, target, extra] = await Promise.all([
    prisma.appUser.findUnique({ where: { id: guardianId }, select: { id: true, createdAt: true } }),
    prisma.appUser.findMany({
      where: { role: "APP_MEMO", guardedBy: { some: { guardianId, status: "ACCEPTED" } } },
      select: { id: true, createdAt: true },
    }),
    getMemorialFeatures(guardianId),
    prisma.appUser.findUnique({
      where: { id: profileId },
      select: { genCode: { select: { id: true } } },
    }),
    getExtraUnits(guardianId, "QR_CODE"),
  ])

  // A memorial that redeemed a GenCode is unlocked on its own terms and never
  // competes for one of the guardian's shared free ranks. This is the product
  // working as sold: the plaque IS that memorial's QR code, so it cannot be
  // rank-gated. It also used to cover a memorial bound to its own AppSale, but
  // that bulk-slot binding is gone along with the channel that created it.
  //
  // This is now the ONLY place a GenCode affects entitlement. Redeeming one no
  // longer grants a tier (getMemorialFeatures resolves it like any other
  // profile, i.e. FREE for a fresh account) — so do not read this as "licensed
  // profiles are privileged"; they are unlocked for this one binary, nothing else.
  //
  // Deliberately NOT "does getMemorialFeatures(profileId) resolve non-FREE" —
  // that would also be true whenever ANY co-guardian of a shared memorial pays
  // (a real cascade, but one that already governs `limit` below via the VIEWING
  // guardian's own tier); folding it in here would let every memorial of a
  // paying guardian bypass rank entirely, defeating the shared-slots heuristic.
  const hasOwnUnlock = !!target?.genCode

  const ranked = [...(guardian ? [guardian] : []), ...memorials].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  )

  const index = ranked.findIndex((p) => p.id === profileId)
  const rank = index === -1 ? ranked.length + 1 : index + 1

  const limit = features.qrCodeMax + extra
  return { unlocked: hasOwnUnlock || rank <= limit, rank, limit }
}
