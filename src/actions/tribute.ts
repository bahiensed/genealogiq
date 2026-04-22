"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { tributeSchema } from "@/schemas/tribute"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { deleteBlobs } from "@/lib/blob"

export async function submitTribute(profileId: string, data: unknown) {
  const session = await verifySession()
  if (session.user.id === profileId) return { error: "You cannot tribute your own profile." }

  const parsed = tributeSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const existing = await prisma.tribute.findUnique({
    where: { authorId_profileId: { authorId: session.user.id, profileId } },
    select: { imageUrl: true },
  })
  if (existing?.imageUrl && existing.imageUrl !== parsed.data.imageUrl) {
    await deleteBlobs([existing.imageUrl])
  }

  await prisma.tribute.upsert({
    where: { authorId_profileId: { authorId: session.user.id, profileId } },
    create: { authorId: session.user.id, profileId, ...parsed.data, status: "PENDING" },
    update: { ...parsed.data, status: "PENDING" },
  })

  revalidatePath(`/profile/${profileId}/tributes`)
  return { success: true }
}

export async function approveTribute(tributeId: string, profileId: string) {
  const session = await verifySession()

  const profile = await getProfileById(profileId)
  if (!profile || !canManageProfile(profile, session.user.id)) return { error: "Not authorized." }

  await prisma.tribute.update({ where: { id: tributeId }, data: { status: "APPROVED" } })
  revalidatePath(`/profile/${profileId}/tributes`)
  revalidatePath(`/profile/${profileId}/tributes/moderate`)
  return { success: true }
}

export async function rejectTribute(tributeId: string, profileId: string) {
  const session = await verifySession()

  const profile = await getProfileById(profileId)
  if (!profile || !canManageProfile(profile, session.user.id)) return { error: "Not authorized." }

  await prisma.tribute.update({ where: { id: tributeId }, data: { status: "REJECTED" } })
  revalidatePath(`/profile/${profileId}/tributes/moderate`)
  return { success: true }
}

export async function deleteTribute(profileId: string) {
  const session = await verifySession()

  const tribute = await prisma.tribute.findFirst({
    where: { authorId: session.user.id, profileId },
    select: { imageUrl: true },
  })
  await deleteBlobs([tribute?.imageUrl])

  await prisma.tribute.deleteMany({ where: { authorId: session.user.id, profileId } })
  revalidatePath(`/profile/${profileId}/tributes`)
  return { success: true }
}
