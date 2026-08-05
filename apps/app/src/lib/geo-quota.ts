import "server-only"

import { prisma } from "@/lib/prisma"
import { getMemorialFeatures } from "@/lib/subscription"
import { getExtraUnits } from "@/lib/extra-units"

export interface GeoQuotaStatus {
  usage: number
  limit: number
}

// Geo places are a single pool shared across a guardian's own profile and
// every memorial they manage (ACCEPTED) — same pattern qr-quota.ts already
// uses for QR codes — plus any extra slots purchased on top.
export async function getGuardianGeoPlacesStatus(guardianId: string): Promise<GeoQuotaStatus> {
  const memorials = await prisma.appUser.findMany({
    where: { role: "APP_MEMO", guardedBy: { some: { guardianId, status: "ACCEPTED" } } },
    select: { id: true },
  })
  const profileIds = [guardianId, ...memorials.map((m) => m.id)]

  const [usage, features, extra] = await Promise.all([
    prisma.geoPlace.count({ where: { userId: { in: profileIds } } }),
    getMemorialFeatures(guardianId),
    getExtraUnits(guardianId, "GEO_PLACE"),
  ])

  return { usage, limit: features.geoPlacesMax + extra }
}
