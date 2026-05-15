"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { tributeSchema } from "@/schemas/tribute"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { deleteBlobs } from "@/lib/blob"
import { notify, markNotificationsRead } from "@/lib/notifications"

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

  const tribute = await prisma.tribute.upsert({
    where: { authorId_profileId: { authorId: session.user.id, profileId } },
    create: { authorId: session.user.id, profileId, ...parsed.data, status: "PENDING" },
    update: { ...parsed.data, status: "PENDING" },
  })

  // Notify everyone who can moderate this profile: the profile owner (when it's
  // a living user) and any guardians (typical for memorial profiles). Deduped.
  const guardians = await prisma.appUserGuardian.findMany({
    where:  { appUserId: profileId },
    select: { guardianId: true },
  })
  const recipientIds = new Set<string>([profileId, ...guardians.map((g) => g.guardianId)])
  recipientIds.delete(session.user.id) // never notify the author about their own tribute
  for (const recipientId of recipientIds) {
    await notify({
      type:      "TRIBUTE_PENDING",
      userId:    recipientId,
      actorId:   session.user.id,
      tributeId: tribute.id,
    })
  }

  revalidatePath(`/profile/${profileId}/tributes`)
  return { success: true }
}

export async function approveTribute(tributeId: string, profileId: string) {
  const session = await verifySession()

  const profile = await getProfileById(profileId)
  if (!profile || !canManageProfile(profile, session.user.id)) return { error: "Not authorized." }

  const tribute = await prisma.tribute.update({
    where: { id: tributeId },
    data:  { status: "APPROVED" },
    select: { authorId: true },
  })

  // Mark pending notifications for this tribute (for any guardian) as read.
  await prisma.notification.updateMany({
    where: { tributeId, type: "TRIBUTE_PENDING", readAt: null },
    data:  { readAt: new Date() },
  })

  // Notify the tribute author.
  await notify({
    type:      "TRIBUTE_APPROVED",
    userId:    tribute.authorId,
    actorId:   session.user.id,
    tributeId,
  })

  revalidatePath(`/profile/${profileId}/tributes`)
  revalidatePath(`/profile/${profileId}/tributes/moderate`)
  return { success: true }
}

export async function rejectTribute(tributeId: string, profileId: string) {
  const session = await verifySession()

  const profile = await getProfileById(profileId)
  if (!profile || !canManageProfile(profile, session.user.id)) return { error: "Not authorized." }

  const tribute = await prisma.tribute.update({
    where: { id: tributeId },
    data:  { status: "REJECTED" },
    select: { authorId: true },
  })

  await prisma.notification.updateMany({
    where: { tributeId, type: "TRIBUTE_PENDING", readAt: null },
    data:  { readAt: new Date() },
  })

  await notify({
    type:      "TRIBUTE_REJECTED",
    userId:    tribute.authorId,
    actorId:   session.user.id,
    tributeId,
  })

  revalidatePath(`/profile/${profileId}/tributes/moderate`)
  return { success: true }
}

export async function deleteTribute(profileId: string) {
  const session = await verifySession()

  const tribute = await prisma.tribute.findFirst({
    where: { authorId: session.user.id, profileId },
    select: { id: true, imageUrl: true },
  })
  if (tribute?.id) {
    await markNotificationsRead(session.user.id, { tributeId: tribute.id })
  }
  await deleteBlobs([tribute?.imageUrl])

  await prisma.tribute.deleteMany({ where: { authorId: session.user.id, profileId } })
  revalidatePath(`/profile/${profileId}/tributes`)
  return { success: true }
}
