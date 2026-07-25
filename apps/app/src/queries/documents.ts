import { prisma } from "@/lib/prisma"

// Anonymous visitors see a bounded slice, then a scroll-triggered hard wall —
// mirrors Places' ANON_PLACES_LIMIT / Gallery's ANON_GALLERY_LIMIT.
export const ANON_DOCUMENTS_LIMIT = 12

function scopeWhere(userId: string, includePrivate: boolean) {
  return { userId, ...(includePrivate ? {} : { isPublic: true }) }
}

/**
 * Full document rows for the collection view / edit form.
 *
 * `includePrivate` is a REAL security boundary, not a display filter — a private
 * document must never even be fetched into the RSC payload for a viewer who
 * isn't the owner/guardian. Callers must thread the caller's `canManageProfile`
 * result in here (never compute/filter visibility client-side).
 */
export async function getDocumentsByUserId(
  userId: string,
  opts: { includePrivate: boolean; take?: number },
) {
  return prisma.document.findMany({
    where: scopeWhere(userId, opts.includePrivate),
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    take: opts.take,
  })
}

export async function getDocumentsCount(userId: string, includePrivate: boolean): Promise<number> {
  return prisma.document.count({ where: scopeWhere(userId, includePrivate) })
}

export type DocumentRow = Awaited<ReturnType<typeof getDocumentsByUserId>>[number]
