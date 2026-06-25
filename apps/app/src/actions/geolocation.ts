"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { done, fail, type ActionResult } from "@genealogiq/core"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { getGeolocationSchema } from "@/schemas/geolocation"
import { identityTranslator } from "@/schemas/i18n"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { deleteBlobs } from "@/lib/blob"
import { getMemorialFeatures } from "@/lib/subscription"

export async function saveGeolocation(profileId: string, data: unknown): Promise<ActionResult> {
  const t = await getTranslations("Actions")
  const session = await verifySession()

  const profile = await getProfileById(profileId)
  if (!profile || !canManageProfile(profile, session.user.id)) return fail(t("geolocation.notAuthorized"))

  const parsed = getGeolocationSchema(identityTranslator).safeParse(data)
  if (!parsed.success) return fail(t("common.invalidData"))

  const existing = await prisma.geolocation.findUnique({
    where: { userId: profileId },
    select: { photo1: true, photo2: true, photo3: true },
  })
  if (existing) {
    const newPhotos = new Set([parsed.data.photo1, parsed.data.photo2, parsed.data.photo3].filter(Boolean))
    await deleteBlobs(
      [existing.photo1, existing.photo2, existing.photo3].filter((u): u is string => !!u && !newPhotos.has(u)),
    )
  }

  const features = await getMemorialFeatures(profileId)

  // Flatten the nested address object into the DB columns;
  // when the tier doesn't allow precise coordinates, force lat/lon to 0.
  const { address, ...rest } = parsed.data
  const flat = {
    ...rest,
    ...address,
    lat: features.geolocationFullAccess ? rest.lat : 0,
    lon: features.geolocationFullAccess ? rest.lon : 0,
  }

  await prisma.geolocation.upsert({
    where: { userId: profileId },
    create: { userId: profileId, ...flat },
    update: flat,
  })

  revalidatePath(`/profile/${profileId}/geolocation`)
  return done()
}

export async function deleteGeolocation(profileId: string): Promise<ActionResult> {
  const t = await getTranslations("Actions")
  const session = await verifySession()

  const profile = await getProfileById(profileId)
  if (!profile || !canManageProfile(profile, session.user.id)) return fail(t("geolocation.notAuthorized"))

  const existing = await prisma.geolocation.findUnique({
    where: { userId: profileId },
    select: { photo1: true, photo2: true, photo3: true },
  })
  await deleteBlobs([existing?.photo1, existing?.photo2, existing?.photo3])

  await prisma.geolocation.deleteMany({ where: { userId: profileId } })
  revalidatePath(`/profile/${profileId}/geolocation`)
  return done()
}
