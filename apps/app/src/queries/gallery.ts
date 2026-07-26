import { prisma } from "@/lib/prisma"

// redactMetaForAnon: an anonymous viewer's click-gate never lets the lightbox
// (the only UI that shows takenAt/location/description) open — but without
// this, those fields still rode along in the RSC payload for every visible
// item, inspectable without ever passing the gate. Nulled the same way
// redactLivingProfile nulls sensitive fields conditionally, not selected out,
// so the return shape stays identical either way.
export async function getGalleryByUserId(userId: string, take?: number, redactMetaForAnon = false) {
  const items = await prisma.galleryItem.findMany({
    where: { userId },
    orderBy: { order: "asc" },
    take,
  })
  if (!redactMetaForAnon) return items
  return items.map((item) => ({ ...item, takenAt: null, location: null, description: null }))
}

// Image/video totals via two cheap indexed counts — used for the gallery badges on
// the anonymous preview, which only loads a bounded slice of the items themselves.
export async function getGalleryCounts(userId: string): Promise<{ images: number; videos: number }> {
  const [images, videos] = await Promise.all([
    prisma.galleryItem.count({ where: { userId, kind: "image" } }),
    prisma.galleryItem.count({ where: { userId, kind: "video" } }),
  ])
  return { images, videos }
}

export async function getGalleryImageUrls(userId: string, limit = 4): Promise<string[]> {
  const rows = await prisma.galleryItem.findMany({
    where: { userId, kind: "image" },
    select: { url: true },
    take: limit,
    orderBy: { order: "asc" },
  })
  return rows.map((r) => r.url)
}

export async function getGalleryCount(userId: string): Promise<number> {
  return prisma.galleryItem.count({ where: { userId } })
}

export async function getGalleryHasVideos(userId: string): Promise<boolean> {
  const count = await prisma.galleryItem.count({ where: { userId, kind: "video" } })
  return count > 0
}

export type GalleryItemRow = Awaited<ReturnType<typeof getGalleryByUserId>>[number]
