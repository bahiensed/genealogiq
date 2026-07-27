"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"
import { done, fail, type ActionResult } from "@genealogiq/core"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/dal"
import { getDocumentSchema } from "@/schemas/document.schema"
import { identityTranslator } from "@/schemas/i18n"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { deleteBlobs } from "@/lib/blob"
import { getMemorialFeatures } from "@/lib/subscription"

/**
 * Create (documentId = null) or update an existing document.
 * Quota is enforced on creation only.
 */
export async function saveDocument(
  profileId: string,
  documentId: string | null,
  data: unknown,
): Promise<ActionResult> {
  const t = await getTranslations("Actions")
  const session = await verifySession()

  const profile = await getProfileById(profileId)
  if (!profile || !canManageProfile(profile, session.user.id)) return fail(t("documents.notAuthorized"))

  const parsed = getDocumentSchema(identityTranslator).safeParse(data)
  if (!parsed.success) return fail(t("common.invalidData"))

  const flat = parsed.data

  if (documentId) {
    // Update — the row must belong to this profile.
    const existing = await prisma.document.findFirst({
      where: { id: documentId, userId: profileId },
      select: { fileUrl: true },
    })
    if (!existing) return fail(t("documents.notFound"))

    if (existing.fileUrl !== flat.fileUrl) {
      await deleteBlobs([existing.fileUrl])
    }

    await prisma.document.update({ where: { id: documentId }, data: flat })
  } else {
    // Create — enforce the per-plan cap.
    const count = await prisma.document.count({ where: { userId: profileId } })
    const { documentsMax } = await getMemorialFeatures(profileId)
    if (count >= documentsMax) {
      return fail(t("documents.limitReached", { max: documentsMax }))
    }

    await prisma.document.create({ data: { userId: profileId, order: count, ...flat } })
  }

  revalidatePath(`/profile/${profileId}/documents`)
  return done()
}

export async function deleteDocument(profileId: string, documentId: string): Promise<ActionResult> {
  const t = await getTranslations("Actions")
  const session = await verifySession()

  const profile = await getProfileById(profileId)
  if (!profile || !canManageProfile(profile, session.user.id)) return fail(t("documents.notAuthorized"))

  const existing = await prisma.document.findFirst({
    where: { id: documentId, userId: profileId },
    select: { fileUrl: true },
  })
  if (!existing) return fail(t("documents.notFound"))

  await deleteBlobs([existing.fileUrl])
  await prisma.document.delete({ where: { id: documentId } })

  revalidatePath(`/profile/${profileId}/documents`)
  return done()
}
