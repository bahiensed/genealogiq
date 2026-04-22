import { prisma } from "@/lib/prisma"

export async function getGalleryByUserId(userId: string) {
  return prisma.galleryItem.findMany({
    where: { userId },
    orderBy: { order: "asc" },
  })
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

export type GalleryItemRow = Awaited<ReturnType<typeof getGalleryByUserId>>[number]
