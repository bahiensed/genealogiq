"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { saveGallerySchema } from "@/schemas/gallery"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { deleteBlobs } from "@/lib/blob"
import { getMemorialFeatures } from "@/lib/subscription"

export async function saveGallery(profileId: string, data: unknown) {
  const session = await verifySession()

  const profile = await getProfileById(profileId)
  if (!profile || !canManageProfile(profile, session.user.id)) return { error: "Not authorized." }

  const parsed = saveGallerySchema.safeParse(data)
  if (!parsed.success) return { error: "Invalid data" }

  const { items } = parsed.data

  const features = await getMemorialFeatures(profileId)
  const imgCount = items.filter((i) => i.kind === "image").length
  const vidCount = items.filter((i) => i.kind === "video").length
  if (imgCount > features.galleryMaxImages) {
    return { error: `Image limit is ${features.galleryMaxImages} for this plan.` }
  }
  if (vidCount > features.galleryMaxVideos) {
    return { error: `Video limit is ${features.galleryMaxVideos} for this plan.` }
  }

  const oldItems = await prisma.galleryItem.findMany({
    where: { userId: profileId },
    select: { url: true },
  })
  const newUrls = new Set(items.map((i) => i.url))
  await deleteBlobs(oldItems.map((i) => i.url).filter((u) => !newUrls.has(u)))

  await prisma.galleryItem.deleteMany({ where: { userId: profileId } })

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
        userId: profileId,
      })),
    })
  }

  revalidatePath(`/profile/${profileId}/gallery`)
  return { success: true }
}

export async function deleteGallery(profileId: string) {
  const session = await verifySession()

  const profile = await getProfileById(profileId)
  if (!profile || !canManageProfile(profile, session.user.id)) return { error: "Not authorized." }

  const items = await prisma.galleryItem.findMany({
    where: { userId: profileId },
    select: { url: true },
  })
  await deleteBlobs(items.map((i) => i.url))

  await prisma.galleryItem.deleteMany({ where: { userId: profileId } })
  revalidatePath(`/profile/${profileId}/gallery`)
  return { success: true }
}
