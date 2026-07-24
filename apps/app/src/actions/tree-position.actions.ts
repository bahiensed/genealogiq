"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { done, fail, type ActionResult } from "@genealogiq/core"
import { checkRateLimit } from "@genealogiq/services/rate-limit"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { saveNodePositionSchema } from "@/schemas/tree-position.schema"

// Not membership-checked against rootId's tree beyond the ownership gate
// below: a forged personId just creates an inert row, since the canvas only
// ever applies an override for a person it actually rendered in THIS root's
// computed layout (see family-tree-canvas.tsx).
export async function saveNodePosition(rootId: string, data: unknown): Promise<ActionResult> {
  const t = await getTranslations("Actions")
  const session = await verifySession()

  const profile = await getProfileById(rootId)
  if (!profile || !canManageProfile(profile, session.user.id)) return fail(t("familyTree.notAuthorized"))

  const limit = await checkRateLimit({ key: `family-tree:position:${session.user.id}`, maxAttempts: 120, windowSeconds: 3600 })
  if (!limit.allowed) return fail(t("familyTree.tooManyRequests"))

  const parsed = saveNodePositionSchema.safeParse(data)
  if (!parsed.success) return fail(parsed.error.issues[0].message)
  const { personId, dx, dy, generation } = parsed.data

  await prisma.treeNodePosition.upsert({
    where:  { rootId_personId: { rootId, personId } },
    create: { rootId, personId, dx, dy, generation },
    update: { dx, dy, generation },
  })

  revalidatePath(`/profile/${rootId}/tree`)
  return done()
}
