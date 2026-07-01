"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { ok, done, fail, type ActionResult } from "@genealogiq/core"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { getMemorialSchema } from "@/schemas/memorial.schema"
import { getProfileEditSchema } from "@/schemas/profile.schema"
import { identityTranslator } from "@/schemas/i18n"
import { getProfileById, getProfileForEdit } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { deleteBlobs } from "@/lib/blob"

export async function createMemorial(data: unknown): Promise<ActionResult<{ id: string }>> {
  const t = await getTranslations("Actions")
  const session = await verifySession()

  const [createdCount, sales] = await Promise.all([
    prisma.appUser.count({
      where: { role: "APP_MEMO", guardedBy: { some: { guardianId: session.user.id, status: "ACCEPTED" } } },
    }),
    prisma.appSale.findMany({
      where: { appUserId: session.user.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        subscription: { select: { maxProfiles: true } },
        _count: { select: { assignedTo: true } },
      },
    }),
  ])

  // Pick the first AppSale that still has an open slot (fewer assigned memorials
  // than its subscription's maxProfiles).
  const nextSale = sales.find((s) => s._count.assignedTo < s.subscription.maxProfiles)

  // Free tier: allow 1 memorial without AppSale. Beyond that, require a sale slot.
  if (!nextSale && createdCount >= 1) {
    return fail(t("memorial.noQrCodes"))
  }

  const parsed = getMemorialSchema(identityTranslator).safeParse(data)
  if (!parsed.success) return fail(t("common.invalidData"))

  const { firstName, lastName, gender, birthDate, birthPlace, birthCountry, deathDate, deathPlace, deathCountry, avatarUrl } = parsed.data

  const memorial = await prisma.appUser.create({
    data: {
      firstName,
      lastName,
      gender: gender ?? null,
      role: "APP_MEMO",
      birthDate,
      birthPlace,
      birthCountry,
      deathDate,
      deathPlace,
      deathCountry,
      avatarUrl,
      appSaleId: nextSale?.id ?? null,
    },
  })

  await prisma.appUserGuardian.create({
    data: { appUserId: memorial.id, guardianId: session.user.id },
  })

  revalidatePath(`/profile/${session.user.id}/memorialized`)
  return ok({ id: memorial.id })
}

export async function deleteMemorial(profileId: string): Promise<ActionResult> {
  const t = await getTranslations("Actions")
  const session = await verifySession()

  const profile = await getProfileById(profileId)
  if (!profile || profile.role !== "APP_MEMO") return fail(t("memorial.notFound"))
  if (!canManageProfile(profile, session.user.id)) return fail(t("memorial.notAuthorized"))

  const [bio, galleryItems, tributes, geo] = await Promise.all([
    prisma.bio.findUnique({
      where: { userId: profileId },
      include: { images: { select: { url: true } } },
    }),
    prisma.galleryItem.findMany({ where: { userId: profileId }, select: { url: true } }),
    prisma.tribute.findMany({ where: { profileId }, select: { imageUrl: true } }),
    prisma.geolocation.findUnique({
      where: { userId: profileId },
      select: { photo1: true, photo2: true, photo3: true },
    }),
  ])

  await deleteBlobs([
    profile.avatarUrl,
    ...(bio?.images.map((i) => i.url) ?? []),
    ...galleryItems.map((i) => i.url),
    ...tributes.map((t) => t.imageUrl),
    geo?.photo1,
    geo?.photo2,
    geo?.photo3,
  ])

  await prisma.appUser.delete({ where: { id: profileId } })
  revalidatePath(`/profile/${session.user.id}`)
  return done()
}

export async function updateMemorial(profileId: string, data: unknown): Promise<ActionResult> {
  const t = await getTranslations("Actions")
  const session = await verifySession()

  // Manager-only edit path — uses the full projection (needs address id).
  const profile = await getProfileForEdit(profileId)
  if (!profile || profile.role !== "APP_MEMO") return fail(t("memorial.notFound"))
  if (!canManageProfile(profile, session.user.id)) return fail(t("memorial.notAuthorized"))

  const parsed = getProfileEditSchema(identityTranslator, true).safeParse(data)
  if (!parsed.success) return fail(t("common.invalidData"))

  const {
    firstName, lastName, maidenName, nickname, gender, avatarUrl,
    birthDate, birthPlace, birthState, birthCountry,
    deathDate, deathPlace, deathState, deathCountry, deathCause,
    website, instagram, linkedin, fb, x, tiktok, youtube, otherSocial,
    notes,
  } = parsed.data

  if (profile.avatarUrl && profile.avatarUrl !== avatarUrl) {
    await deleteBlobs([profile.avatarUrl])
  }

  // National ID / contact / address are no longer part of the form — leave those
  // columns untouched so any existing data is preserved.
  await prisma.appUser.update({
    where: { id: profileId },
    data: {
      firstName, lastName,
      maidenName:   maidenName   || null,
      nickname:     nickname     || null,
      gender:       gender       ?? null,
      avatarUrl:    avatarUrl    ?? null,
      birthDate:    birthDate    ?? null,
      birthPlace:   birthPlace   || null,
      birthState:   birthState   || null,
      birthCountry: birthCountry || null,
      deathDate:    deathDate    ?? null,
      deathPlace:   deathPlace   || null,
      deathState:   deathState   || null,
      deathCountry: deathCountry || null,
      deathCause:   deathCause   || null,
      website:      website      || null,
      instagram:    instagram    || null,
      linkedin:     linkedin     || null,
      fb:           fb           || null,
      x:            x            || null,
      tiktok:       tiktok       || null,
      youtube:      youtube      || null,
      otherSocial:  otherSocial  || null,
      notes:        notes        || null,
    },
  })

  revalidatePath(`/profile/${profileId}`)
  return done()
}
