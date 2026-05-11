"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { getMemorialFeatures } from "@/lib/subscription"
import { addRelationSchema, ghostRelativeSchema } from "@/schemas/family-tree"

const defaultSubtype: Record<string, string> = {
  PARENT_OF: "blood",
  SPOUSE: "married",
  SIBLING: "blood",
}

/** Returns the set of AppUser IDs reachable from rootId via FamilyRelation. */
async function getTreeMemberIds(rootId: string): Promise<Set<string>> {
  const discovered = new Set<string>([rootId])
  let frontier = [rootId]
  while (frontier.length > 0) {
    const relations = await prisma.familyRelation.findMany({
      where:  { OR: [{ fromId: { in: frontier } }, { toId: { in: frontier } }] },
      select: { fromId: true, toId: true },
    })
    const next: string[] = []
    for (const r of relations) {
      if (!discovered.has(r.fromId)) { discovered.add(r.fromId); next.push(r.fromId) }
      if (!discovered.has(r.toId))   { discovered.add(r.toId);   next.push(r.toId) }
    }
    frontier = next
  }
  return discovered
}

export async function addRelation(rootId: string, data: unknown) {
  const session = await verifySession()

  const profile = await getProfileById(rootId)
  if (!profile || !canManageProfile(profile, session.user.id)) return { error: "Not authorized." }

  const parsed = addRelationSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { fromId, toId, type, subtype } = parsed.data

  if (fromId === toId) return { error: "A profile cannot be related to itself." }

  const [from, to] = await Promise.all([
    prisma.appUser.findUnique({ where: { id: fromId }, select: { id: true } }),
    prisma.appUser.findUnique({ where: { id: toId },   select: { id: true } }),
  ])
  if (!from || !to) return { error: "Profile not found." }

  // Tier limit: only enforced when this relation would grow the tree.
  const features = await getMemorialFeatures(rootId)
  const memberIds = await getTreeMemberIds(rootId)
  const wouldGrow = !memberIds.has(fromId) || !memberIds.has(toId)
  if (wouldGrow && memberIds.size + 1 > features.treeMaxMembers) {
    return { error: `Family tree limit is ${features.treeMaxMembers} people on this plan.` }
  }

  // Symmetric types: normalise so fromId < toId to prevent duplicate pairs
  const [normFrom, normTo] =
    (type === "SPOUSE" || type === "SIBLING") && fromId > toId
      ? [toId, fromId]
      : [fromId, toId]

  try {
    await prisma.familyRelation.create({
      data: {
        id: crypto.randomUUID(),
        fromId: normFrom,
        toId: normTo,
        type,
        subtype: subtype ?? defaultSubtype[type],
      },
    })
  } catch {
    return { error: "This relation already exists." }
  }

  revalidatePath(`/profile/${rootId}/tree`)
  return { success: true }
}

export async function removeRelation(rootId: string, relativeId: string, type: string) {
  const session = await verifySession()

  const profile = await getProfileById(rootId)
  if (!profile || !canManageProfile(profile, session.user.id)) return { error: "Not authorized." }

  await prisma.familyRelation.deleteMany({
    where: {
      type,
      OR: [
        { fromId: rootId, toId: relativeId },
        { fromId: relativeId, toId: rootId },
      ],
    },
  })

  revalidatePath(`/profile/${rootId}/tree`)
  return { success: true }
}

/**
 * Creates a placeholder (APP_GHOST) AppUser and links it to an anchor node
 * in a single transaction. Used when the relative isn't on the platform.
 */
export async function addGhostRelative(rootId: string, data: unknown) {
  const session = await verifySession()

  const profile = await getProfileById(rootId)
  if (!profile || !canManageProfile(profile, session.user.id)) return { error: "Not authorized." }

  const parsed = ghostRelativeSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { firstName, lastName, gender, birthDate, deathDate, anchorId, kind } = parsed.data

  // Enforce tier limit — adding a ghost always grows the tree by 1.
  const features = await getMemorialFeatures(rootId)
  const memberIds = await getTreeMemberIds(rootId)
  if (memberIds.size + 1 > features.treeMaxMembers) {
    return { error: `Family tree limit is ${features.treeMaxMembers} people on this plan.` }
  }

  // Translate UI relation "kind" to FamilyRelation orientation.
  let fromId: string
  let toId: string
  let type: "PARENT_OF" | "SPOUSE" | "SIBLING"
  let subtype: string

  const ghostId = crypto.randomUUID()

  if (kind === "parent") {
    fromId = ghostId; toId = anchorId; type = "PARENT_OF"; subtype = "blood"
  } else if (kind === "child") {
    fromId = anchorId; toId = ghostId; type = "PARENT_OF"; subtype = "blood"
  } else if (kind === "sibling") {
    fromId = anchorId; toId = ghostId; type = "SIBLING"; subtype = "blood"
  } else {
    fromId = anchorId; toId = ghostId; type = "SPOUSE"; subtype = "married"
  }

  // Normalise symmetric types so fromId < toId.
  const [normFrom, normTo] =
    (type === "SPOUSE" || type === "SIBLING") && fromId > toId
      ? [toId, fromId]
      : [fromId, toId]

  await prisma.$transaction(async (tx) => {
    await tx.appUser.create({
      data: {
        id:        ghostId,
        firstName,
        lastName,
        gender:    gender ?? null,
        role:      "APP_GHOST",
        birthDate: birthDate ? new Date(birthDate) : null,
        deathDate: deathDate ? new Date(deathDate) : null,
      },
    })

    await tx.appUserGuardian.create({
      data: { appUserId: ghostId, guardianId: session.user.id },
    })

    await tx.familyRelation.create({
      data: {
        id: crypto.randomUUID(),
        fromId: normFrom,
        toId: normTo,
        type,
        subtype,
      },
    })
  })

  revalidatePath(`/profile/${rootId}/tree`)
  return { success: true, id: ghostId }
}
