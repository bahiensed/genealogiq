import { prisma } from "@/lib/prisma"

export async function getMemorialsByCreatorId(guardianId: string) {
  return prisma.appUser.findMany({
    where: { role: "APP_MEMO", guardedBy: { some: { guardianId, status: "ACCEPTED" } } },
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

export async function countMemorialsByCreatorId(guardianId: string) {
  return prisma.appUser.count({
    where: { role: "APP_MEMO", guardedBy: { some: { guardianId, status: "ACCEPTED" } } },
  })
}
