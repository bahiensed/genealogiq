import { prisma } from "@/lib/prisma"

/**
 * Raw geolocation row — exact coordinates as stored. Manager/edit paths only.
 */
export async function getGeolocationByUserId(userId: string) {
  return prisma.geolocation.findUnique({ where: { userId } })
}

/**
 * Viewer-facing geolocation. Coordinates are public by design, but only when the
 * memorial's CURRENT tier grants precise access. Write-time masking alone is not
 * enough: a memorial downgraded after saving precise coordinates would keep
 * serving them. We re-apply the tier gate on read so stale precise coordinates
 * are never exposed. (Security M2.)
 */
export async function getGeolocationForViewer(userId: string) {
  // Coordinates were blanked for tiers without geolocationFullAccess. Precise
  // location is free now, so the row is returned as stored.
  return prisma.geolocation.findUnique({ where: { userId } })
}

export type GeolocationRow = NonNullable<Awaited<ReturnType<typeof getGeolocationByUserId>>>
