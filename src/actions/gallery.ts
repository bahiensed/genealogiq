"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { saveGallerySchema } from "@/schemas/gallery"
import { deleteBlobs } from "@/lib/blob"

export async function saveGallery(data: unknown) {
  const session = await verifySession()
  const parsed = saveGallerySchema.safeParse(data)
  if (!parsed.success) return { error: "Invalid data" }

  const { items } = parsed.data

  const oldItems = await prisma.galleryItem.findMany({
    where: { userId: session.user.id },
    select: { url: true },
  })
  const newUrls = new Set(items.map((i) => i.url))
  await deleteBlobs(oldItems.map((i) => i.url).filter((u) => !newUrls.has(u)))

  await prisma.galleryItem.deleteMany({ where: { userId: session.user.id } })

  if (items.length > 0) {
    await prisma.galleryItem.createMany({
      data: items.map((item, i) => ({
        id: item.id,
        kind: item.kind,
        url: item.url,
        poster: item.poster,
        durationSec: item.durationSec,
        takenAt: item.takenAt,
        location: item.location,
        description: item.description,
        order: i,
        userId: session.user.id,
      })),
    })
  }

  revalidatePath(`/profile/${session.user.id}/gallery`)
  return { success: true }
}

export async function deleteGallery() {
  const session = await verifySession()

  const items = await prisma.galleryItem.findMany({
    where: { userId: session.user.id },
    select: { url: true },
  })
  await deleteBlobs(items.map((i) => i.url))

  await prisma.galleryItem.deleteMany({ where: { userId: session.user.id } })
  revalidatePath(`/profile/${session.user.id}/gallery`)
  return { success: true }
}
