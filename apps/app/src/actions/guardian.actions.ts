"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { done, fail, type ActionResult } from "@genealogiq/core"
import { checkRateLimit } from "@genealogiq/services/rate-limit"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { notify } from "@/lib/notifications"
import {
  requestGuardianshipSchema,
  guardianshipActionSchema,
} from "@/schemas/guardian.schema"

// ─── requestGuardianship ─────────────────────────────────────────────────────
//
// A user who is NOT yet a guardian of `profileId` asks to co-manage it.
// Restricted to APP_GHOST / APP_MEMO / APP_PET profiles (real APP_USERs
// already manage themselves). The row lands as PENDING and every existing
// accepted guardian gets notified.

export async function requestGuardianship(data: unknown): Promise<ActionResult> {
  const t = await getTranslations("Actions")
  const session = await verifySession()
  const parsed  = requestGuardianshipSchema.safeParse(data)
  if (!parsed.success) return fail(parsed.error.issues[0].message)
  const { profileId } = parsed.data

  const limit = await checkRateLimit({ key: `guardian:request:${session.user.id}`, maxAttempts: 20, windowSeconds: 3600 })
  if (!limit.allowed) return fail(t("guardian.tooManyRequests"))

  if (profileId === session.user.id) {
    return fail(t("guardian.cannotManageOwn"))
  }

  const profile = await prisma.appUser.findUnique({
    where:  { id: profileId },
    select: {
      id: true, role: true, firstName: true, lastName: true,
      guardedBy: { select: { guardianId: true, status: true } },
    },
  })
  if (!profile) return fail(t("guardian.profileNotFound"))

  // Real APP_USERs manage themselves; co-guardianship requests are for
  // ghosts, memorials, and pets only (subjects who can't speak for
  // themselves).
  if (profile.role !== "APP_GHOST" && profile.role !== "APP_MEMO" && profile.role !== "APP_PET") {
    return fail(t("guardian.coManageUnsupported"))
  }

  const existing = profile.guardedBy.find((g) => g.guardianId === session.user.id)
  if (existing?.status === "ACCEPTED") return fail(t("guardian.alreadyCoManage"))
  if (existing?.status === "PENDING")  return fail(t("guardian.requestPending"))

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
  return done()
}

// ─── approveGuardianship ─────────────────────────────────────────────────────

export async function approveGuardianship(data: unknown): Promise<ActionResult> {
  const t = await getTranslations("Actions")
  const session = await verifySession()
  const parsed  = guardianshipActionSchema.safeParse(data)
  if (!parsed.success) return fail(parsed.error.issues[0].message)
  const { guardianshipId } = parsed.data

  const guardianship = await prisma.appUserGuardian.findUnique({
    where:  { id: guardianshipId },
    select: {
      id: true, appUserId: true, guardianId: true, status: true,
      appUser: { select: { guardedBy: { select: { guardianId: true, status: true } } } },
    },
  })
  if (!guardianship) return fail(t("guardian.requestNotFound"))
  if (guardianship.status !== "PENDING") return fail(t("guardian.requestResolved"))

  const canApprove = guardianship.appUser.guardedBy.some(
    (g) => g.guardianId === session.user.id && g.status === "ACCEPTED",
  )
  if (!canApprove) return fail(t("guardian.notAuthorized"))

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
  return done()
}

// ─── rejectGuardianship ──────────────────────────────────────────────────────

export async function rejectGuardianship(data: unknown): Promise<ActionResult> {
  const t = await getTranslations("Actions")
  const session = await verifySession()
  const parsed  = guardianshipActionSchema.safeParse(data)
  if (!parsed.success) return fail(parsed.error.issues[0].message)
  const { guardianshipId } = parsed.data

  const guardianship = await prisma.appUserGuardian.findUnique({
    where:  { id: guardianshipId },
    select: {
      id: true, appUserId: true, guardianId: true, status: true, requestedById: true,
      appUser: { select: { guardedBy: { select: { guardianId: true, status: true } } } },
    },
  })
  if (!guardianship) return fail(t("guardian.requestNotFound"))
  if (guardianship.status !== "PENDING") return fail(t("guardian.requestResolved"))

  // An existing ACCEPTED guardian may reject it, or the requester may withdraw
  // their own still-pending request (mirrors canManageRelation's equivalent
  // carve-out for family-relation invites in family-tree.actions.ts).
  const canReject =
    guardianship.appUser.guardedBy.some((g) => g.guardianId === session.user.id && g.status === "ACCEPTED") ||
    guardianship.requestedById === session.user.id
  if (!canReject) return fail(t("guardian.notAuthorized"))

  // Skip the notification on self-withdrawal — the requester already knows
  // they withdrew their own request.
  if (guardianship.guardianId !== session.user.id) {
    await notify({
      type:    "GUARDIAN_REQUEST_REJECTED",
      userId:  guardianship.guardianId,
      actorId: session.user.id,
      // appUserGuardianId omitted: row is about to be deleted (cascade would null out anyway).
    })
  }

  await prisma.appUserGuardian.delete({ where: { id: guardianshipId } })

  revalidatePath(`/profile/${guardianship.appUserId}`)
  revalidatePath(`/messages`)
  return done()
}
