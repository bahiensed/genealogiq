import { prisma } from "@/lib/prisma"
import { getMemorialFeatures } from "@/lib/subscription"

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
  const geo = await prisma.geolocation.findUnique({ where: { userId } })
  if (!geo) return null

  const { geolocationFullAccess } = await getMemorialFeatures(userId)
  if (!geolocationFullAccess) {
    return { ...geo, lat: 0, lon: 0 }
  }
  return geo
}

export type GeolocationRow = NonNullable<Awaited<ReturnType<typeof getGeolocationByUserId>>>
