"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { memorialSchema } from "@/schemas/memorial"
import { profileEditSchema } from "@/schemas/profile"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { deleteBlobs } from "@/lib/blob"

export async function createMemorial(data: unknown) {
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
    return { error: "No available QR Codes. Purchase a QR Code to create more profiles." }
  }

  const parsed = memorialSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

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
  return { success: true, id: memorial.id }
}

export async function deleteMemorial(profileId: string) {
  const session = await verifySession()

  const profile = await getProfileById(profileId)
  if (!profile || profile.role !== "APP_MEMO") return { error: "Profile not found." }
  if (!canManageProfile(profile, session.user.id)) return { error: "Unauthorized." }

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
  return { success: true }
}

export async function updateMemorial(profileId: string, data: unknown) {
  const session = await verifySession()

  const profile = await getProfileById(profileId)
  if (!profile || profile.role !== "APP_MEMO") return { error: "Profile not found." }
  if (!canManageProfile(profile, session.user.id)) return { error: "Unauthorized." }

  const parsed = profileEditSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const {
    firstName, lastName, maidenName, nickname, gender, nationalId, avatarUrl,
    birthDate, birthPlace, birthState, birthCountry,
    deathDate, deathPlace, deathState, deathCountry, deathCause,
    phoneCountryCode, phone,
    website, instagram, linkedin, fb, x, tiktok, youtube, otherSocial,
    notes,
    address,
  } = parsed.data

  if (profile.avatarUrl && profile.avatarUrl !== avatarUrl) {
    await deleteBlobs([profile.avatarUrl])
  }

  const addressId = await upsertAddress(profile.address?.id ?? null, address)

  await prisma.appUser.update({
    where: { id: profileId },
    data: {
      firstName, lastName,
      maidenName:       maidenName       || null,
      nickname:         nickname         || null,
      gender:           gender           ?? null,
      nationalId:       nationalId       || null,
      avatarUrl:        avatarUrl        ?? null,
      birthDate:        birthDate        ?? null,
      birthPlace:       birthPlace       || null,
      birthState:       birthState       || null,
      birthCountry:     birthCountry     || null,
      deathDate:        deathDate        ?? null,
      deathPlace:       deathPlace       || null,
      deathState:       deathState       || null,
      deathCountry:     deathCountry     || null,
      deathCause:       deathCause       || null,
      phoneCountryCode: phoneCountryCode || "55",
      phone:            phone            || null,
      website:          website          || null,
      instagram:        instagram        || null,
      linkedin:         linkedin         || null,
      fb:               fb               || null,
      x:                x                || null,
      tiktok:           tiktok           || null,
      youtube:          youtube          || null,
      otherSocial:      otherSocial      || null,
      notes:            notes            || null,
      addressId,
    },
  })

  revalidatePath(`/profile/${profileId}`)
  return { success: true, id: profileId }
}

async function upsertAddress(
  existingId: string | null,
  data: Record<string, string | null | undefined>,
): Promise<string | null> {
  const hasData = Object.entries(data).some(
    ([k, v]) => k !== "country" && typeof v === "string" && v.trim(),
  )

  if (!hasData) {
    if (existingId) {
      await prisma.address.delete({ where: { id: existingId } }).catch(() => {})
    }
    return null
  }

  if (existingId) {
    await prisma.address.update({ where: { id: existingId }, data })
    return existingId
  }

  const created = await prisma.address.create({ data })
  return created.id
}
