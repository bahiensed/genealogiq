import { prisma } from "@/lib/prisma"
import { getMemorialFeatures, isSaleLive } from "@/lib/subscription"

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
// level QR access has always been a binary, per-profile thing (physicalQrLicense/
// appSaleId), never a count. This ranks a guardian's own profile plus every
// memorial they manage (ACCEPTED) by creation order, live, with no schema
// change: the first `qrCodeMax` of them are free. Documented as an initial
// approximation — if "which QR counts as one of the free ones" ever needs to
// be a deliberate, sticky choice rather than always-oldest-first, that needs
// a persisted flag (a later migration), not this heuristic.
export async function getQrQuotaStatus(guardianId: string, profileId: string): Promise<QrQuotaStatus> {
  const [guardian, memorials, features, target] = await Promise.all([
    prisma.appUser.findUnique({ where: { id: guardianId }, select: { id: true, createdAt: true } }),
    prisma.appUser.findMany({
      where: { role: "APP_MEMO", guardedBy: { some: { guardianId, status: "ACCEPTED" } } },
      select: { id: true, createdAt: true },
    }),
    getMemorialFeatures(guardianId),
    prisma.appUser.findUnique({
      where: { id: profileId },
      select: {
        physicalQrLicense: { select: { id: true } },
        appSale:           { select: { status: true, currentPeriodEnd: true } },
      },
    }),
  ])

  // A profile with its own dedicated paid slot (a physical QR product, or a
  // legacy bulk-package slot assigned directly to it via BMS/SEQ) is unlocked
  // on its own terms — it never competes for one of the guardian's shared
  // free ranks. This is deliberately NOT "does getMemorialFeatures(profileId)
  // resolve non-FREE" — that would also be true whenever ANY co-guardian of a
  // shared memorial pays (a real cascade, but one that already governs
  // `limit` below via the VIEWING guardian's own tier); folding that in here
  // too would let every memorial of a paying guardian bypass rank entirely,
  // which defeats the shared 2-free-slots heuristic.
  const hasOwnUnlock = !!target?.physicalQrLicense || isSaleLive(target?.appSale)

  const ranked = [...(guardian ? [guardian] : []), ...memorials].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  )

  const index = ranked.findIndex((p) => p.id === profileId)
  const rank = index === -1 ? ranked.length + 1 : index + 1

  return { unlocked: hasOwnUnlock || rank <= features.qrCodeMax, rank, limit: features.qrCodeMax }
}
