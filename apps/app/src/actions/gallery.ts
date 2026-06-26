"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { done, fail, type ActionResult } from "@genealogiq/core"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { saveGallerySchema } from "@/schemas/gallery"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { deleteBlobs } from "@/lib/blob"
import { getMemorialFeatures } from "@/lib/subscription"

export async function saveGallery(profileId: string, data: unknown): Promise<ActionResult> {
  const t = await getTranslations("Actions")
  const session = await verifySession()

  const profile = await getProfileById(profileId)
  if (!profile || !canManageProfile(profile, session.user.id)) return fail(t("gallery.notAuthorized"))

  const parsed = saveGallerySchema.safeParse(data)
  if (!parsed.success) return fail(t("common.invalidData"))

  const { items } = parsed.data

  const features = await getMemorialFeatures(profileId)
  const imgCount = items.filter((i) => i.kind === "image").length
  const vidCount = items.filter((i) => i.kind === "video").length
  if (imgCount > features.galleryMaxImages) {
    return fail(t("gallery.imageLimit", { max: features.galleryMaxImages }))
  }
  if (vidCount > features.galleryMaxVideos) {
    return fail(t("gallery.videoLimit", { max: features.galleryMaxVideos }))
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
        // id is DB-generated (cuid) — never persist a client-supplied primary key.
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
  return done()
}

export async function deleteGallery(profileId: string): Promise<ActionResult> {
  const t = await getTranslations("Actions")
  const session = await verifySession()

  const profile = await getProfileById(profileId)
  if (!profile || !canManageProfile(profile, session.user.id)) return fail(t("gallery.notAuthorized"))

  const items = await prisma.galleryItem.findMany({
    where: { userId: profileId },
    select: { url: true },
  })
  await deleteBlobs(items.map((i) => i.url))

  await prisma.galleryItem.deleteMany({ where: { userId: profileId } })
  revalidatePath(`/profile/${profileId}/gallery`)
  return done()
}
