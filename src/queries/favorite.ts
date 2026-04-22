import { prisma } from "@/lib/prisma"

export async function getFavoritesByUserId(userId: string) {
  return prisma.favorite.findMany({
    where: { userId },
    include: {
      target: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          role: true,
          birthDate: true,
          birthPlace: true,
          birthCountry: true,
          deathDate: true,
          deathPlace: true,
          deathCountry: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

export type FavoriteRow = Awaited<ReturnType<typeof getFavoritesByUserId>>[number]

export async function isFavoritedByUser(userId: string, targetId: string) {
  const fav = await prisma.favorite.findUnique({
    where: { userId_targetId: { userId, targetId } },
    select: { userId: true },
  })
  return !!fav
}

export async function getFavoriteCount(targetId: string) {
  return prisma.favorite.count({ where: { targetId } })
}
