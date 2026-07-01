import { prisma } from "@/lib/prisma"

export async function getGalleryByUserId(userId: string, take?: number) {
  return prisma.galleryItem.findMany({
    where: { userId },
    orderBy: { order: "asc" },
    take,
  })
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
