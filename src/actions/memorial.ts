"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { memorialSchema } from "@/schemas/memorial"
import { getProfileById } from "@/queries/profile"
import { deleteBlobs } from "@/lib/blob"

const MAX_MEMORIALS = 2

export async function createMemorial(data: unknown) {
  const session = await verifySession()

  const count = await prisma.user.count({
    where: { createdById: session.user.id, role: "APP_MEMO" },
  })
  if (count >= MAX_MEMORIALS) {
    return { error: `You have reached the limit of ${MAX_MEMORIALS} memorialized profiles.` }
  }

  const parsed = memorialSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { firstName, lastName, gender, birthDate, birthPlace, birthCountry, deathDate, deathPlace, deathCountry, avatarUrl } = parsed.data

  const memorial = await prisma.user.create({
    data: {
      firstName,
      lastName,
      gender: gender ?? null,
      email: `memorial-${Date.now()}@genealogiq.internal`,
      role: "APP_MEMO",
      birthDate,
      birthPlace,
      birthCountry,
      deathDate,
      deathPlace,
      deathCountry,
      avatarUrl,
      createdById: session.user.id,
    },
  })

  revalidatePath(`/profile/${session.user.id}/memorialized`)
  return { success: true, id: memorial.id }
}

export async function deleteMemorial(profileId: string) {
  const session = await verifySession()

  const profile = await getProfileById(profileId)
  if (!profile || profile.role !== "APP_MEMO") return { error: "Profile not found." }
  if (profile.createdById !== session.user.id) return { error: "Unauthorized." }

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

  await prisma.user.delete({ where: { id: profileId } })
  revalidatePath(`/profile/${session.user.id}`)
  return { success: true }
}

export async function updateMemorial(profileId: string, data: unknown) {
  const session = await verifySession()

  const profile = await getProfileById(profileId)
  if (!profile || profile.role !== "APP_MEMO") return { error: "Profile not found." }
  if (profile.createdById !== session.user.id) return { error: "Unauthorized." }

  const parsed = memorialSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { firstName, lastName, gender, birthDate, birthPlace, birthCountry, deathDate, deathPlace, deathCountry, avatarUrl } = parsed.data

  if (profile.avatarUrl && profile.avatarUrl !== avatarUrl) {
    await deleteBlobs([profile.avatarUrl])
  }

  await prisma.user.update({
    where: { id: profileId },
    data: { firstName, lastName, gender: gender ?? null, birthDate, birthPlace, birthCountry, deathDate, deathPlace, deathCountry, avatarUrl },
  })

  revalidatePath(`/profile/${profileId}`)
  return { success: true, id: profileId }
}
