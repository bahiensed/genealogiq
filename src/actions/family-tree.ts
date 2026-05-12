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
    prisma.appUser.findUnique({ where: { id: fromId }, select: { id: true } }),
    prisma.appUser.findUnique({ where: { id: toId },   select: { id: true } }),
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

  const [normFrom, normTo] = normalizePair(type, fromId, toId)

  try {
    await prisma.familyRelation.create({
      data: {
        id:        crypto.randomUUID(),
        fromId:    normFrom,
        toId:      normTo,
        type,
        subtype,
        startDate: toDate(startDate),
        endDate:   toDate(endDate),
      },
    })
  } catch {
    return { error: "This relation already exists." }
  }

  revalidatePath(`/profile/${rootId}/tree`)
  return { success: true }
}

// ─── addGhostRelative ────────────────────────────────────────────────────────

export async function addGhostRelative(rootId: string, data: unknown) {
  const session = await verifySession()

  const profile = await getProfileById(rootId)
  if (!profile || !canManageProfile(profile, session.user.id)) return { error: "Not authorized." }

  const parsed = addGhostRelativeSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const {
    firstName, lastName, maidenName, nickname, shortBio,
    gender, birthDate, deathDate,
    anchorId, kind, subtype, startDate, endDate,
  } = parsed.data

  // Tier limit (always +1 here).
  const features = await getMemorialFeatures(rootId)
  const memberCount = await countTreeMembers(rootId)
  if (memberCount + 1 > features.treeMaxMembers) {
    return { error: `Family tree limit is ${features.treeMaxMembers} people on this plan.` }
  }

  const ghostId = crypto.randomUUID()

  let fromId: string
  let toId:   string
  let type:   RelationType

  if (kind === "parent")      { fromId = ghostId;  toId = anchorId; type = "PARENT_OF" }
  else if (kind === "child")  { fromId = anchorId; toId = ghostId;  type = "PARENT_OF" }
  else if (kind === "sibling"){ fromId = anchorId; toId = ghostId;  type = "SIBLING" }
  else                        { fromId = anchorId; toId = ghostId;  type = "SPOUSE" }

  const [normFrom, normTo] = normalizePair(type, fromId, toId)

  await prisma.$transaction(async (tx) => {
    await tx.appUser.create({
      data: {
        id:        ghostId,
        firstName,
        lastName,
        maidenName: maidenName ?? null,
        nickname:   nickname ?? null,
        shortBio:   shortBio ?? null,
        gender:     gender ?? null,
        role:       "APP_GHOST",
        birthDate:  toDate(birthDate),
        deathDate:  toDate(deathDate),
      },
    })

    await tx.appUserGuardian.create({
      data: { appUserId: ghostId, guardianId: session.user.id },
    })

    await tx.familyRelation.create({
      data: {
        id:        crypto.randomUUID(),
        fromId:    normFrom,
        toId:      normTo,
        type,
        subtype,
        startDate: toDate(startDate),
        endDate:   toDate(endDate),
      },
    })
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
      shortBio:   d.shortBio ?? null,
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
    data:  { subtype, startDate: toDate(startDate), endDate: toDate(endDate) },
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
