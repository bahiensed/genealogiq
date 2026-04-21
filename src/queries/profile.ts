import { prisma } from "@/lib/prisma"

export async function getProfileById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      avatarUrl: true,
      birthDate: true,
      birthPlace: true,
      birthCountry: true,
      deathDate: true,
      deathPlace: true,
      deathCountry: true,
    },
  })
}

export type ProfileRow = NonNullable<Awaited<ReturnType<typeof getProfileById>>>
