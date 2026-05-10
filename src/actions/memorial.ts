"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { memorialSchema } from "@/schemas/memorial"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { deleteBlobs } from "@/lib/blob"

export async function createMemorial(data: unknown) {
  const session = await verifySession()

  const [createdCount, nextSale] = await Promise.all([
    prisma.appUser.count({
      where: { role: "APP_MEMO", guardedBy: { some: { guardianId: session.user.id } } },
    }),
    prisma.appSale.findFirst({
      where: { appUserId: session.user.id, assignedTo: null },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }),
  ])

  // Free tier: allow 1 memorial without AppSale. Beyond that, require an unassigned AppSale.
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

  const parsed = memorialSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { firstName, lastName, gender, birthDate, birthPlace, birthCountry, deathDate, deathPlace, deathCountry, avatarUrl } = parsed.data

  if (profile.avatarUrl && profile.avatarUrl !== avatarUrl) {
    await deleteBlobs([profile.avatarUrl])
  }

  await prisma.appUser.update({
    where: { id: profileId },
    data: { firstName, lastName, gender: gender ?? null, birthDate, birthPlace, birthCountry, deathDate, deathPlace, deathCountry, avatarUrl },
  })

  revalidatePath(`/profile/${profileId}`)
  return { success: true, id: profileId }
}
