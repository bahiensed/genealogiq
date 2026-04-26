"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { z } from "zod"

const addRelationSchema = z.object({
  fromId: z.string().cuid(),
  toId: z.string().cuid(),
  type: z.enum(["PARENT_OF", "SPOUSE", "SIBLING"]),
  subtype: z.string().optional(),
})

const defaultSubtype: Record<string, string> = {
  PARENT_OF: "blood",
  SPOUSE: "married",
  SIBLING: "blood",
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
