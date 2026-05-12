"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { getMemorialFeatures } from "@/lib/subscription"
import { countTreeMembers } from "@/queries/family-tree"
import {
  addRelationSchema,
  addGhostRelativeSchema,
  updateMemberSchema,
  updateRelationSchema,
} from "@/schemas/family-tree"
import { notify } from "@/lib/notifications"

type RelationType = "PARENT_OF" | "SPOUSE" | "SIBLING"

function normalizePair(type: RelationType, fromId: string, toId: string): [string, string] {
  if ((type === "SPOUSE" || type === "SIBLING") && fromId > toId) return [toId, fromId]
  return [fromId, toId]
}

function toDate(s: string | null | undefined): Date | null {
  return s ? new Date(s) : null
}

// ─── addRelation ─────────────────────────────────────────────────────────────

export async function addRelation(rootId: string, data: unknown) {
  const session = await verifySession()

  const profile = await getProfileById(rootId)
  if (!profile || !canManageProfile(profile, session.user.id)) return { error: "Not authorized." }

  const parsed = addRelationSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { fromId, toId, type, subtype, startDate, endDate } = parsed.data

  if (fromId === toId) return { error: "A profile cannot be related to itself." }

  const [from, to] = await Promise.all([
    prisma.appUser.findUnique({ where: { id: fromId }, select: { id: true, role: true } }),
    prisma.appUser.findUnique({ where: { id: toId },   select: { id: true, role: true } }),
  ])
  if (!from || !to) return { error: "Profile not found." }

  // Tier limit (only enforced when the tree would grow).
  const features = await getMemorialFeatures(rootId)
  const memberCount = await countTreeMembers(rootId)
  const relExists = await prisma.familyRelation.findFirst({
    where: { OR: [
      { fromId, toId: rootId }, { fromId: rootId, toId },
      { toId,   fromId: rootId }, { toId: rootId, fromId },
    ] },
    select: { id: true },
  })
  const involvesNew = !relExists && (fromId !== rootId && toId !== rootId)
  if (involvesNew && memberCount + 1 > features.treeMaxMembers) {
    return { error: `Family tree limit is ${features.treeMaxMembers} people on this plan.` }
  }

  // The "other" endpoint (the one being invited). Adding a real APP_USER
  // who isn't the actor requires their consent — relation goes PENDING.
  const otherId = fromId === rootId ? toId : toId === rootId ? fromId : null
  const otherRole = fromId === rootId ? to.role : toId === rootId ? from.role : null
  const needsConsent = !!otherId && otherRole === "APP_USER" && otherId !== session.user.id

  const [normFrom, normTo] = normalizePair(type, fromId, toId)

  // Default subtype: SPOUSE always implies "married" unless overridden;
  // PARENT_OF / SIBLING use null to mean a regular blood relation.
  const finalSubtype = subtype ?? (type === "SPOUSE" ? "married" : null)

  let createdRelationId: string
  try {
    const created = await prisma.familyRelation.create({
      data: {
        fromId:        normFrom,
        toId:          normTo,
        type,
        subtype:       finalSubtype,
        startDate:     toDate(startDate),
        endDate:       toDate(endDate),
        status:        needsConsent ? "PENDING" : "ACCEPTED",
        requestedById: needsConsent ? session.user.id : null,
      },
      select: { id: true },
    })
    createdRelationId = created.id
  } catch {
    return { error: "This relation already exists." }
  }

  if (needsConsent && otherId) {
    await notify({
      type:             "FAMILY_REQUEST_PENDING",
      userId:           otherId,
      actorId:          session.user.id,
      familyRelationId: createdRelationId,
    })
  }

  revalidatePath(`/profile/${rootId}/tree`)
  return { success: true, pending: needsConsent }
}

// ─── addGhostRelative ────────────────────────────────────────────────────────

export async function addGhostRelative(rootId: string, data: unknown) {
  const session = await verifySession()

  const profile = await getProfileById(rootId)
  if (!profile || !canManageProfile(profile, session.user.id)) return { error: "Not authorized." }

  const parsed = addGhostRelativeSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const {
    firstName, lastName, maidenName, nickname,
    gender, birthDate, deathDate,
    anchorId, kind, subtype, startDate, endDate,
  } = parsed.data

  // Tier limit (always +1 here).
  const features = await getMemorialFeatures(rootId)
  const memberCount = await countTreeMembers(rootId)
  if (memberCount + 1 > features.treeMaxMembers) {
    return { error: `Family tree limit is ${features.treeMaxMembers} people on this plan.` }
  }

  let kindType: RelationType
  if (kind === "parent" || kind === "child") kindType = "PARENT_OF"
  else if (kind === "sibling")               kindType = "SIBLING"
  else                                        kindType = "SPOUSE"

  const finalSubtype = subtype ?? (kindType === "SPOUSE" ? "married" : null)

  const ghostId = await prisma.$transaction(async (tx) => {
    const ghost = await tx.appUser.create({
      data: {
        firstName,
        lastName,
        maidenName: maidenName ?? null,
        nickname:   nickname ?? null,
        gender:     gender ?? null,
        role:       "APP_GHOST",
        birthDate:  toDate(birthDate),
        deathDate:  toDate(deathDate),
      },
      select: { id: true },
    })

    await tx.appUserGuardian.create({
      data: { appUserId: ghost.id, guardianId: session.user.id },
    })

    let fromId: string
    let toId:   string
    if (kind === "parent")      { fromId = ghost.id; toId = anchorId }
    else if (kind === "child")  { fromId = anchorId; toId = ghost.id }
    else                        { fromId = anchorId; toId = ghost.id }
    const [normFrom, normTo] = normalizePair(kindType, fromId, toId)

    await tx.familyRelation.create({
      data: {
        fromId:    normFrom,
        toId:      normTo,
        type:      kindType,
        subtype:   finalSubtype,
        startDate: toDate(startDate),
        endDate:   toDate(endDate),
        // Ghosts are placeholders; no consent needed.
        status:    "ACCEPTED",
      },
    })

    return ghost.id
  })

  revalidatePath(`/profile/${rootId}/tree`)
  return { success: true, id: ghostId }
}

// ─── updateMember ────────────────────────────────────────────────────────────

export async function updateMember(rootId: string, memberId: string, data: unknown) {
  const session = await verifySession()

  const rootProfile = await getProfileById(rootId)
  if (!rootProfile || !canManageProfile(rootProfile, session.user.id)) return { error: "Not authorized." }

  const member = await prisma.appUser.findUnique({
    where:  { id: memberId },
    select: { id: true, role: true },
  })
  if (!member) return { error: "Member not found." }

  // Non-ghost members can only be edited via canManageProfile (own/guardian).
  if (member.role !== "APP_GHOST") {
    const target = await getProfileById(memberId)
    if (!target || !canManageProfile(target, session.user.id)) return { error: "Not authorized." }
  }

  const parsed = updateMemberSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const d = parsed.data
  await prisma.appUser.update({
    where: { id: memberId },
    data: {
      firstName:  d.firstName,
      lastName:   d.lastName,
      maidenName: d.maidenName ?? null,
      nickname:   d.nickname ?? null,
      gender:     d.gender ?? null,
      birthDate:  toDate(d.birthDate),
      deathDate:  toDate(d.deathDate),
      avatarUrl:  d.avatarUrl ?? null,
    },
  })

  revalidatePath(`/profile/${rootId}/tree`)
  return { success: true }
}

// ─── updateRelation ──────────────────────────────────────────────────────────

export async function updateRelation(rootId: string, relationId: string, data: unknown) {
  const session = await verifySession()

  const profile = await getProfileById(rootId)
  if (!profile || !canManageProfile(profile, session.user.id)) return { error: "Not authorized." }

  const parsed = updateRelationSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { subtype, startDate, endDate } = parsed.data

  await prisma.familyRelation.update({
    where: { id: relationId },
    data:  { subtype: subtype ?? null, startDate: toDate(startDate), endDate: toDate(endDate) },
  })

  revalidatePath(`/profile/${rootId}/tree`)
  return { success: true }
}

// ─── removeRelation ──────────────────────────────────────────────────────────

export async function removeRelation(rootId: string, relationId: string) {
  const session = await verifySession()

  const profile = await getProfileById(rootId)
  if (!profile || !canManageProfile(profile, session.user.id)) return { error: "Not authorized." }

  await prisma.familyRelation.delete({ where: { id: relationId } })
  revalidatePath(`/profile/${rootId}/tree`)
  return { success: true }
}

// ─── removeMember (ghost only) ───────────────────────────────────────────────

export async function removeMember(rootId: string, memberId: string) {
  const session = await verifySession()

  const profile = await getProfileById(rootId)
  if (!profile || !canManageProfile(profile, session.user.id)) return { error: "Not authorized." }

  const member = await prisma.appUser.findUnique({
    where:  { id: memberId },
    select: { id: true, role: true },
  })
  if (!member) return { error: "Member not found." }
  if (member.role !== "APP_GHOST") {
    return { error: "Only placeholder members can be removed from here. Use the profile delete flow for memorials." }
  }

  await prisma.appUser.delete({ where: { id: memberId } })
  revalidatePath(`/profile/${rootId}/tree`)
  return { success: true }
}

// ─── acceptFamilyRequest / rejectFamilyRequest ───────────────────────────────

export async function acceptFamilyRequest(relationId: string) {
  const session = await verifySession()

  const relation = await prisma.familyRelation.findUnique({
    where:  { id: relationId },
    select: { id: true, fromId: true, toId: true, status: true, requestedById: true },
  })
  if (!relation) return { error: "Request not found." }
  if (relation.status !== "PENDING") return { error: "This request has already been decided." }

  const isTarget = relation.fromId === session.user.id || relation.toId === session.user.id
  if (!isTarget || relation.requestedById === session.user.id) return { error: "Not authorized." }

  await prisma.familyRelation.update({
    where: { id: relationId },
    data:  { status: "ACCEPTED" },
  })

  await prisma.notification.updateMany({
    where: { familyRelationId: relationId, userId: session.user.id, readAt: null },
    data:  { readAt: new Date() },
  })

  if (relation.requestedById) {
    await notify({
      type:             "FAMILY_REQUEST_ACCEPTED",
      userId:           relation.requestedById,
      actorId:          session.user.id,
      familyRelationId: relationId,
    })
  }

  revalidatePath("/family-requests")
  return { success: true }
}

export async function rejectFamilyRequest(relationId: string) {
  const session = await verifySession()

  const relation = await prisma.familyRelation.findUnique({
    where:  { id: relationId },
    select: { id: true, fromId: true, toId: true, status: true, requestedById: true },
  })
  if (!relation) return { error: "Request not found." }
  if (relation.status !== "PENDING") return { error: "This request has already been decided." }

  const isTarget = relation.fromId === session.user.id || relation.toId === session.user.id
  if (!isTarget || relation.requestedById === session.user.id) return { error: "Not authorized." }

  // Notify the requester BEFORE deleting (deletion cascades the existing notif rows).
  if (relation.requestedById) {
    await notify({
      type:    "FAMILY_REQUEST_REJECTED",
      userId:  relation.requestedById,
      actorId: session.user.id,
    })
  }

  await prisma.familyRelation.delete({ where: { id: relationId } })

  revalidatePath("/family-requests")
  return { success: true }
}
