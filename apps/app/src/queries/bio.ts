import { prisma } from "@/lib/prisma"

export async function getBioByUserId(userId: string) {
  return prisma.bio.findUnique({
    where: { userId },
    include: {
      images: { orderBy: { order: "asc" } },
    },
  })
}

export type BioRow = NonNullable<Awaited<ReturnType<typeof getBioByUserId>>>
