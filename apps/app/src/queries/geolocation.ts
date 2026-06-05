import { prisma } from "@/lib/prisma"

export async function getGeolocationByUserId(userId: string) {
  return prisma.geolocation.findUnique({ where: { userId } })
}

export type GeolocationRow = NonNullable<Awaited<ReturnType<typeof getGeolocationByUserId>>>
