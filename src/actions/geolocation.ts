"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { geolocationSchema } from "@/schemas/geolocation"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { deleteBlobs } from "@/lib/blob"

export async function saveGeolocation(profileId: string, data: unknown) {
  const session = await verifySession()

  const profile = await getProfileById(profileId)
  if (!profile || !canManageProfile(profile, session.user.id)) return { error: "Not authorized." }

  const parsed = geolocationSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

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

  await prisma.geolocation.upsert({
    where: { userId: profileId },
    create: { userId: profileId, ...parsed.data },
    update: parsed.data,
  })

  revalidatePath(`/profile/${profileId}/geolocation`)
  return { success: true }
}

export async function deleteGeolocation(profileId: string) {
  const session = await verifySession()

  const profile = await getProfileById(profileId)
  if (!profile || !canManageProfile(profile, session.user.id)) return { error: "Not authorized." }

  const existing = await prisma.geolocation.findUnique({
    where: { userId: profileId },
    select: { photo1: true, photo2: true, photo3: true },
  })
  await deleteBlobs([existing?.photo1, existing?.photo2, existing?.photo3])

  await prisma.geolocation.deleteMany({ where: { userId: profileId } })
  revalidatePath(`/profile/${profileId}/geolocation`)
  return { success: true }
}
