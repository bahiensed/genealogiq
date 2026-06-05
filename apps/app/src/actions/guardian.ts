"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { notify } from "@/lib/notifications"
import {
  requestGuardianshipSchema,
  guardianshipActionSchema,
} from "@/schemas/guardian"

// ─── requestGuardianship ─────────────────────────────────────────────────────
//
// A user who is NOT yet a guardian of `profileId` asks to co-manage it.
// Restricted to APP_GHOST / APP_MEMO profiles (real APP_USERs already manage
// themselves). The row lands as PENDING and every existing accepted guardian
// gets notified.

export async function requestGuardianship(data: unknown) {
  const session = await verifySession()
  const parsed  = requestGuardianshipSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const { profileId } = parsed.data

  if (profileId === session.user.id) {
    return { error: "You already manage your own profile." }
  }

  const profile = await prisma.appUser.findUnique({
    where:  { id: profileId },
    select: {
      id: true, role: true, firstName: true, lastName: true,
      guardedBy: { select: { guardianId: true, status: true } },
    },
  })
  if (!profile) return { error: "Profile not found." }

  // Real APP_USERs manage themselves; co-guardianship requests are for ghosts
  // and memorials only (people who can't speak for themselves).
  if (profile.role !== "APP_GHOST" && profile.role !== "APP_MEMO") {
    return { error: "Only ghost and memorial profiles support co-management." }
  }

  const existing = profile.guardedBy.find((g) => g.guardianId === session.user.id)
  if (existing?.status === "ACCEPTED") return { error: "You already co-manage this profile." }
  if (existing?.status === "PENDING")  return { error: "You already have a pending request for this profile." }

  const guardianship = await prisma.appUserGuardian.create({
    data: {
      appUserId:     profileId,
      guardianId:    session.user.id,
      status:        "PENDING",
      requestedById: session.user.id,
    },
    select: { id: true },
  })

  // Notify every current accepted guardian — they're the ones who can approve.
  const recipients = profile.guardedBy
    .filter((g) => g.status === "ACCEPTED")
    .map((g) => g.guardianId)
  await Promise.all(
    recipients.map((uid) => notify({
      type:              "GUARDIAN_REQUEST_PENDING",
      userId:            uid,
      actorId:           session.user.id,
      appUserGuardianId: guardianship.id,
    })),
  )

  revalidatePath(`/profile/${profileId}`)
  revalidatePath(`/messages`)
  return { success: true, id: guardianship.id }
}

// ─── approveGuardianship ─────────────────────────────────────────────────────

export async function approveGuardianship(data: unknown) {
  const session = await verifySession()
  const parsed  = guardianshipActionSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const { guardianshipId } = parsed.data

  const guardianship = await prisma.appUserGuardian.findUnique({
    where:  { id: guardianshipId },
    select: {
      id: true, appUserId: true, guardianId: true, status: true,
      appUser: { select: { guardedBy: { select: { guardianId: true, status: true } } } },
    },
  })
  if (!guardianship) return { error: "Request not found." }
  if (guardianship.status !== "PENDING") return { error: "Request already resolved." }

  const canApprove = guardianship.appUser.guardedBy.some(
    (g) => g.guardianId === session.user.id && g.status === "ACCEPTED",
  )
  if (!canApprove) return { error: "Not authorized." }

  await prisma.appUserGuardian.update({
    where: { id: guardianshipId },
    data:  { status: "ACCEPTED" },
  })

  await notify({
    type:              "GUARDIAN_REQUEST_ACCEPTED",
    userId:            guardianship.guardianId,
    actorId:           session.user.id,
    appUserGuardianId: guardianship.id,
  })

  revalidatePath(`/profile/${guardianship.appUserId}`)
  revalidatePath(`/messages`)
  return { success: true }
}

// ─── rejectGuardianship ──────────────────────────────────────────────────────

export async function rejectGuardianship(data: unknown) {
  const session = await verifySession()
  const parsed  = guardianshipActionSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const { guardianshipId } = parsed.data

  const guardianship = await prisma.appUserGuardian.findUnique({
    where:  { id: guardianshipId },
    select: {
      id: true, appUserId: true, guardianId: true, status: true,
      appUser: { select: { guardedBy: { select: { guardianId: true, status: true } } } },
    },
  })
  if (!guardianship) return { error: "Request not found." }
  if (guardianship.status !== "PENDING") return { error: "Request already resolved." }

  const canReject = guardianship.appUser.guardedBy.some(
    (g) => g.guardianId === session.user.id && g.status === "ACCEPTED",
  )
  if (!canReject) return { error: "Not authorized." }

  await notify({
    type:    "GUARDIAN_REQUEST_REJECTED",
    userId:  guardianship.guardianId,
    actorId: session.user.id,
    // appUserGuardianId omitted: row is about to be deleted (cascade would null out anyway).
  })

  await prisma.appUserGuardian.delete({ where: { id: guardianshipId } })

  revalidatePath(`/profile/${guardianship.appUserId}`)
  revalidatePath(`/messages`)
  return { success: true }
}
