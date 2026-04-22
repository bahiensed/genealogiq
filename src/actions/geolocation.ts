"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { geolocationSchema } from "@/schemas/geolocation"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"

export async function saveGeolocation(profileId: string, data: unknown) {
  const session = await verifySession()

  const profile = await getProfileById(profileId)
  if (!profile || !canManageProfile(profile, session.user.id)) return { error: "Not authorized." }

  const parsed = geolocationSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

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

  await prisma.geolocation.deleteMany({ where: { userId: profileId } })
  revalidatePath(`/profile/${profileId}/geolocation`)
  return { success: true }
}
