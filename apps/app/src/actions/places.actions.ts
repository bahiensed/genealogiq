"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { done, fail, type ActionResult } from "@genealogiq/core"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { getPlaceSchema } from "@/schemas/place.schema"
import { identityTranslator } from "@/schemas/i18n"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { deleteBlobs } from "@/lib/blob"
import { getMemorialFeatures } from "@/lib/subscription"
import { getCombinedMediaUsage } from "@/queries/media-usage"

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Create (placeId = null) or update an existing geo-place. Enforces two
 * independent caps: how many place ROWS this profile may have (create only),
 * and — on both create and update — this place's own photos against the
 * combined image pool shared with Bio and Gallery.
 */
export async function savePlace(
  profileId: string,
  placeId: string | null,
  data: unknown,
): Promise<ActionResult> {
  const t = await getTranslations("Actions")
  const session = await verifySession()

  const profile = await getProfileById(profileId)
  if (!profile || !canManageProfile(profile, session.user.id)) return fail(t("places.notAuthorized"))

  const parsed = getPlaceSchema(identityTranslator).safeParse(data)
  if (!parsed.success) return fail(t("common.invalidData"))

  const { address, startDate, endDate, ...rest } = parsed.data
  const flat = {
    ...rest,
    ...address,
    startDate: toDate(startDate),
    endDate: toDate(endDate),
  }

  const features = await getMemorialFeatures(profileId)

  if (placeId) {
    // Update — the row must belong to this profile.
    const existing = await prisma.geoPlace.findFirst({
      where: { id: placeId, userId: profileId },
      select: { photos: true },
    })
    if (!existing) return fail(t("places.notFound"))

    const combined = await getCombinedMediaUsage(profileId)
    const otherImages = combined.images - existing.photos.length
    if (otherImages + flat.photos.length > features.mediaMaxImages) {
      return fail(t("places.imageLimit", { max: features.mediaMaxImages }))
    }

    const newPhotos = new Set(flat.photos)
    await deleteBlobs(existing.photos.filter((u) => !newPhotos.has(u)))

    await prisma.geoPlace.update({ where: { id: placeId }, data: flat })
  } else {
    // Create — enforce the per-plan row cap.
    const count = await prisma.geoPlace.count({ where: { userId: profileId } })
    if (count >= features.geoPlacesMax) {
      return fail(t("places.limitReached", { max: features.geoPlacesMax }))
    }

    const combined = await getCombinedMediaUsage(profileId)
    if (combined.images + flat.photos.length > features.mediaMaxImages) {
      return fail(t("places.imageLimit", { max: features.mediaMaxImages }))
    }

    await prisma.geoPlace.create({ data: { userId: profileId, order: count, ...flat } })
  }

  revalidatePath(`/profile/${profileId}/places`)
  return done()
}

/**
 * Marks a place's QR code as generated so its detail page renders the code
 * directly on future loads instead of the "Generate" button. Deliberately
 * has no verifySession()/canManageProfile guard, unlike every sibling action
 * here — the QR button itself has always been open to any viewer (not just
 * the owner), and the only thing this flips is a boolean on a row already
 * scoped to profileId+placeId; the QR content itself is a deterministic URL,
 * nothing user-suppliable, so there's nothing sensitive to gate.
 */
export async function markPlaceQrGenerated(profileId: string, placeId: string): Promise<ActionResult> {
  const t = await getTranslations("Actions")

  const existing = await prisma.geoPlace.findFirst({
    where: { id: placeId, userId: profileId },
    select: { qrGenerated: true },
  })
  if (!existing) return fail(t("places.notFound"))

  if (!existing.qrGenerated) {
    await prisma.geoPlace.update({ where: { id: placeId }, data: { qrGenerated: true } })
    revalidatePath(`/profile/${profileId}/places/${placeId}`)
  }

  return done()
}

export async function deletePlace(profileId: string, placeId: string): Promise<ActionResult> {
  const t = await getTranslations("Actions")
  const session = await verifySession()

  const profile = await getProfileById(profileId)
  if (!profile || !canManageProfile(profile, session.user.id)) return fail(t("places.notAuthorized"))

  const existing = await prisma.geoPlace.findFirst({
    where: { id: placeId, userId: profileId },
    select: { photos: true },
  })
  if (!existing) return fail(t("places.notFound"))

  await deleteBlobs(existing.photos)
  await prisma.geoPlace.delete({ where: { id: placeId } })

  revalidatePath(`/profile/${profileId}/places`)
  return done()
}
