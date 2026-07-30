import { prisma } from "@/lib/prisma"

export async function getPetsByCreatorId(guardianId: string) {
  return prisma.appUser.findMany({
    where: { role: "APP_PET", guardedBy: { some: { guardianId, status: "ACCEPTED" } } },
    select: {
      id: true,
      firstName: true,
      avatarUrl: true,
      role: true,
      petSpecies: true,
      petBreed: true,
      birthDate: true,
      deathDate: true,
    },
    orderBy: { createdAt: "desc" },
  })
}

export type PetRow = Awaited<ReturnType<typeof getPetsByCreatorId>>[number]

export async function countPetsByCreatorId(guardianId: string) {
  return prisma.appUser.count({
    where: { role: "APP_PET", guardedBy: { some: { guardianId, status: "ACCEPTED" } } },
  })
}
