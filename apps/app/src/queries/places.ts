import { prisma } from "@/lib/prisma"

// Anonymous visitors see a bounded slice, then a scroll-triggered hard wall —
// mirrors Tributes' ANON_TRIBUTES_LIMIT. Shared by places/page.tsx and
// places/map/page.tsx (same underlying dataset), unlike Gallery/Tributes'
// page-local constants, since here two pages need to agree on the same bound.
export const ANON_PLACES_LIMIT = 12

// Full place rows for the collection view / edit form. Ordered by start date
// (the life-timeline order), falling back to manual `order` then creation.
export async function getPlacesByUserId(userId: string, take?: number) {
  return prisma.geoPlace.findMany({
    where: { userId },
    orderBy: [{ startDate: "asc" }, { order: "asc" }, { createdAt: "asc" }],
    take,
  })
}

export async function getPlacesCount(userId: string): Promise<number> {
  return prisma.geoPlace.count({ where: { userId } })
}

// Lightweight projection for the map view and the profile-card preview — only
// what a pin needs. Skips rows without real coordinates (0,0).
export async function getPlacesForMap(userId: string, take?: number) {
  const rows = await prisma.geoPlace.findMany({
    where: { userId },
    select: { id: true, title: true, lat: true, lon: true, categories: true, photos: true },
    orderBy: [{ startDate: "asc" }, { order: "asc" }],
    take,
  })
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    lat: r.lat,
    lon: r.lon,
    categories: r.categories,
    photo: r.photos[0] ?? null,
  }))
}

export type GeoPlaceRow = Awaited<ReturnType<typeof getPlacesByUserId>>[number]
export type GeoPlaceMapPin = Awaited<ReturnType<typeof getPlacesForMap>>[number]
