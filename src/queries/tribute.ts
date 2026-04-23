import { prisma } from "@/lib/prisma"

export async function getApprovedTributesByProfileId(profileId: string) {
  return prisma.tribute.findMany({
    where: { profileId, status: "APPROVED" },
    include: { author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    orderBy: { createdAt: "desc" },
  })
}

export async function getPendingTributesByProfileId(profileId: string) {
  return prisma.tribute.findMany({
    where: { profileId, status: "PENDING" },
    include: { author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" },
  })
}

export async function getMyTributeForProfile(authorId: string, profileId: string) {
  return prisma.tribute.findUnique({ where: { authorId_profileId: { authorId, profileId } } })
}

export async function getTributeCountByProfileId(profileId: string) {
  return prisma.tribute.count({ where: { profileId, status: "APPROVED" } })
}

export type ApprovedTributeRow = Awaited<ReturnType<typeof getApprovedTributesByProfileId>>[number]

export type TributeAuthorPreview = {
  id: string
  firstName: string
  lastName: string
  avatarUrl: string | null
}

export type TributeNotification = { profileId: string; name: string; count: number }

export async function getPendingTributeNotifications(userId: string): Promise<TributeNotification[]> {
  const profiles = await prisma.user.findMany({
    where: { OR: [{ id: userId }, { createdById: userId, role: "APP_MEMO" }] },
    select: { id: true, firstName: true, lastName: true },
  })

  if (profiles.length === 0) return []

  const profileIds = profiles.map((p) => p.id)

  const counts = await prisma.tribute.groupBy({
    by: ["profileId"],
    where: { profileId: { in: profileIds }, status: "PENDING" },
    _count: { profileId: true },
  })

  const countMap = new Map(counts.map((c) => [c.profileId, c._count.profileId]))

  return profiles
    .filter((p) => (countMap.get(p.id) ?? 0) > 0)
    .map((p) => ({ profileId: p.id, name: `${p.firstName} ${p.lastName}`, count: countMap.get(p.id)! }))
}

export async function getTributeAuthors(profileId: string, limit = 5): Promise<TributeAuthorPreview[]> {
  const rows = await prisma.tribute.findMany({
    where: { profileId, status: "APPROVED" },
    select: { author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    take: limit,
    orderBy: { createdAt: "desc" },
  })
  return rows.map((r) => r.author)
}
