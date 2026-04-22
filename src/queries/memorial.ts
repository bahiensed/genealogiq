import { prisma } from "@/lib/prisma"

export async function getMemorialsByCreatorId(createdById: string) {
  return prisma.user.findMany({
    where: { createdById, role: "APP_MEMO" },
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
    orderBy: { createdAt: "desc" },
  })
}

export type MemorialRow = Awaited<ReturnType<typeof getMemorialsByCreatorId>>[number]

export async function countMemorialsByCreatorId(createdById: string) {
  return prisma.user.count({ where: { createdById, role: "APP_MEMO" } })
}
