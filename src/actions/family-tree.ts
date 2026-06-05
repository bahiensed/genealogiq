"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { getMemorialFeatures } from "@/lib/subscription"
import { countTreeMembers, getTreeMemberIds } from "@/queries/family-tree"
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

  const { fromId, toId, type, subtype, startDate, endDate, linkSpouseId } = parsed.data

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

  // Optional spouse link: when adding a 2nd parent and the UI says they're
  // married to the existing parent, create the SPOUSE relation in one go.
  if (linkSpouseId && type === "PARENT_OF") {
    // The new parent is fromId (PARENT_OF: parent → child).
    const newParentId = fromId
    if (newParentId !== linkSpouseId) {
      const [a, b] = normalizePair("SPOUSE", newParentId, linkSpouseId)
      try {
        await prisma.familyRelation.create({
          data: { fromId: a, toId: b, type: "SPOUSE", subtype: "married", status: "ACCEPTED" },
        })
      } catch {
        // Already exists — ignore.
      }
    }
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
    anchorId, kind, subtype, startDate, endDate, linkSpouseId,
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

    // Spouse link to an existing parent when adding a 2nd parent.
    if (linkSpouseId && kindType === "PARENT_OF" && kind === "parent" && linkSpouseId !== ghost.id) {
      const [a, b] = normalizePair("SPOUSE", ghost.id, linkSpouseId)
      try {
        await tx.familyRelation.create({
          data: { fromId: a, toId: b, type: "SPOUSE", subtype: "married", status: "ACCEPTED" },
        })
      } catch {
        // Already exists — ignore.
      }
    }

    // Auto-link: keep the new node attached to the anchor's existing family
    // so we don't end up with orphan branches (no parents/no siblings/no co-parent).
    const createParentOf = async (parentId: string, childId: string) => {
      if (parentId === childId) return
      const [a, b] = normalizePair("PARENT_OF", parentId, childId)
      try {
        await tx.familyRelation.create({
          data: { fromId: a, toId: b, type: "PARENT_OF", subtype: null, status: "ACCEPTED" },
        })
      } catch {
        // Already exists — ignore.
      }
    }

    if (kind === "sibling") {
      // The new sibling inherits the anchor's parents.
      const parentRels = await tx.familyRelation.findMany({
        where: { toId: anchorId, type: "PARENT_OF", status: { not: "REJECTED" } },
        select: { fromId: true },
      })
      for (const pr of parentRels) await createParentOf(pr.fromId, ghost.id)
    } else if (kind === "child") {
      // The new child inherits the anchor's active spouse as the other parent.
      const spouseRels = await tx.familyRelation.findMany({
        where: {
          type:    "SPOUSE",
          status:  "ACCEPTED",
          endDate: null,
          OR: [{ fromId: anchorId }, { toId: anchorId }],
        },
        select: { fromId: true, toId: true },
      })
      for (const sr of spouseRels) {
        const spouseId = sr.fromId === anchorId ? sr.toId : sr.fromId
        await createParentOf(spouseId, ghost.id)
      }
    } else if (kind === "parent") {
      // The new parent inherits the anchor's siblings as additional children.
      const sibRels = await tx.familyRelation.findMany({
        where: {
          type:   "SIBLING",
          status: { not: "REJECTED" },
          OR: [{ fromId: anchorId }, { toId: anchorId }],
        },
        select: { fromId: true, toId: true },
      })
      for (const sr of sibRels) {
        const sibId = sr.fromId === anchorId ? sr.toId : sr.fromId
        await createParentOf(ghost.id, sibId)
      }
    }

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

  if (member.role === "APP_GHOST") {
    // Ghosts have no owner, so authorize by tree membership: the ghost must be
    // reachable from rootId (which the caller manages). Without this, a manager
    // of one tree could overwrite a ghost belonging to another user's tree (IDOR).
    const memberIds = await getTreeMemberIds(rootId)
    if (!memberIds.has(memberId)) return { error: "Not authorized." }
  } else {
    // Real members (own/guardian) are authorized via canManageProfile.
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

  // The relation must belong to rootId's tree (both endpoints reachable from
  // root). Without this, any manager could edit arbitrary relations by id (IDOR).
  const relation = await prisma.familyRelation.findUnique({
    where:  { id: relationId },
    select: { fromId: true, toId: true },
  })
  if (!relation) return { error: "Relation not found." }
  const memberIds = await getTreeMemberIds(rootId)
  if (!memberIds.has(relation.fromId) || !memberIds.has(relation.toId)) {
    return { error: "Not authorized." }
  }

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

  // The relation must belong to rootId's tree (see updateRelation) — prevents
  // deleting arbitrary relations from other users' trees by id (IDOR).
  const relation = await prisma.familyRelation.findUnique({
    where:  { id: relationId },
    select: { fromId: true, toId: true },
  })
  if (!relation) return { error: "Relation not found." }
  const memberIds = await getTreeMemberIds(rootId)
  if (!memberIds.has(relation.fromId) || !memberIds.has(relation.toId)) {
    return { error: "Not authorized." }
  }

  await prisma.familyRelation.delete({ where: { id: relationId } })
  revalidatePath(`/profile/${rootId}/tree`)
  return { success: true }
}

// ─── removeMember — ghost: delete; real: detach from this tree ───────────────

export async function removeMember(rootId: string, memberId: string) {
  const session = await verifySession()

  const profile = await getProfileById(rootId)
  if (!profile || !canManageProfile(profile, session.user.id)) return { error: "Not authorized." }

  if (memberId === rootId) return { error: "You cannot remove the tree root." }

  const member = await prisma.appUser.findUnique({
    where:  { id: memberId },
    select: { id: true, role: true },
  })
  if (!member) return { error: "Member not found." }

  if (member.role === "APP_GHOST") {
    // Ghosts only live inside one tree — full delete. Authorize by tree
    // membership first: the ghost must be reachable from rootId, otherwise a
    // manager of one tree could delete a ghost from another tree (IDOR).
    const memberIds = await getTreeMemberIds(rootId)
    if (!memberIds.has(memberId)) return { error: "Not authorized." }
    await prisma.appUser.delete({ where: { id: memberId } })
  } else {
    // Real users / memorials keep their profile. Disconnect them from THIS
    // tree by deleting every relation between this member and any current
    // member of the root's reachable set.
    const memberIds = await getTreeMemberIds(rootId)
    const treeOthers = Array.from(memberIds).filter((id) => id !== memberId)
    await prisma.familyRelation.deleteMany({
      where: {
        OR: [
          { fromId: memberId, toId:   { in: treeOthers } },
          { toId:   memberId, fromId: { in: treeOthers } },
        ],
      },
    })
  }

  revalidatePath(`/profile/${rootId}/tree`)
  return { success: true }
}

// ─── acceptFamilyRequest / rejectFamilyRequest ───────────────────────────────

export async function acceptFamilyRequest(relationId: string) {
  const session = await verifySession()

  const relation = await prisma.familyRelation.findUnique({
    where:  { id: relationId },
    select: { id: true, type: true, fromId: true, toId: true, status: true, requestedById: true },
  })
  if (!relation) return { error: "Request not found." }
  if (relation.status !== "PENDING") return { error: "This request has already been decided." }

  const isTarget = relation.fromId === session.user.id || relation.toId === session.user.id
  if (!isTarget || relation.requestedById === session.user.id) return { error: "Not authorized." }

  await prisma.familyRelation.update({
    where: { id: relationId },
    data:  { status: "ACCEPTED" },
  })

  // Transform the accepter's own PENDING notification into ACCEPTED in-place so
  // it persists in their Recent Activity ("You joined <requester>'s family tree").
  await prisma.notification.updateMany({
    where: { familyRelationId: relationId, userId: session.user.id, type: "FAMILY_REQUEST_PENDING" },
    data:  { type: "FAMILY_REQUEST_ACCEPTED", readAt: new Date() },
  })

  if (relation.requestedById) {
    await notify({
      type:             "FAMILY_REQUEST_ACCEPTED",
      userId:           relation.requestedById,
      actorId:          session.user.id,
      familyRelationId: relationId,
    })
  }

  // Bonus: when accepting a SIBLING invitation, the accepter automatically
  // files a PENDING co-guardianship request for each ghost/memorial parent of
  // the inviter — those are the shared parents the accepter now also "owns".
  // The inviter (current guardian) gets a notification and approves/declines.
  if (relation.type === "SIBLING" && relation.requestedById) {
    const inviterId  = relation.requestedById
    const accepterId = session.user.id

    const parentRels = await prisma.familyRelation.findMany({
      where: {
        type:   "PARENT_OF",
        toId:   inviterId,
        status: { not: "REJECTED" },
      },
      select: { fromId: true },
    })

    for (const pr of parentRels) {
      const parent = await prisma.appUser.findUnique({
        where:  { id: pr.fromId },
        select: {
          id: true, role: true,
          guardedBy: { select: { guardianId: true, status: true } },
        },
      })
      if (!parent) continue
      if (parent.role !== "APP_GHOST" && parent.role !== "APP_MEMO") continue
      if (parent.guardedBy.some((g) => g.guardianId === accepterId)) continue

      const created = await prisma.appUserGuardian.create({
        data: {
          appUserId:     parent.id,
          guardianId:    accepterId,
          status:        "PENDING",
          requestedById: accepterId,
        },
        select: { id: true },
      })

      const recipients = parent.guardedBy
        .filter((g) => g.status === "ACCEPTED")
        .map((g) => g.guardianId)
      for (const uid of recipients) {
        await notify({
          type:              "GUARDIAN_REQUEST_PENDING",
          userId:            uid,
          actorId:           accepterId,
          appUserGuardianId: created.id,
        })
      }
    }
  }

  revalidatePath("/family-requests")
  revalidatePath("/messages")
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

  // Keep the row but mark it REJECTED so we preserve the audit trail and the
  // notifications linked to it (tree queries filter REJECTED out).
  await prisma.familyRelation.update({
    where: { id: relationId },
    data:  { status: "REJECTED" },
  })

  // Transform the rejecter's own PENDING notification into REJECTED in-place so
  // it persists in their Recent Activity ("You declined <requester>'s invitation").
  await prisma.notification.updateMany({
    where: { familyRelationId: relationId, userId: session.user.id, type: "FAMILY_REQUEST_PENDING" },
    data:  { type: "FAMILY_REQUEST_REJECTED", readAt: new Date() },
  })

  if (relation.requestedById) {
    await notify({
      type:             "FAMILY_REQUEST_REJECTED",
      userId:           relation.requestedById,
      actorId:          session.user.id,
      familyRelationId: relationId,
    })
  }

  revalidatePath("/family-requests")
  return { success: true }
}
