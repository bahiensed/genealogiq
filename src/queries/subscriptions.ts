import "server-only"

import { prisma } from "@/lib/prisma"

export async function getActiveSubscriptions() {
  const rows = await prisma.subscription.findMany({
    where:   { isActive: true },
    orderBy: { price: "asc" },
    select: {
      id:                    true,
      code:                  true,
      name:                  true,
      description:           true,
      maxProfiles:           true,
      termLength:            true,
      price:                 true,
      treeMaxMembers:        true,
      bioMaxChars:           true,
      bioMaxImages:          true,
      galleryMaxImages:      true,
      galleryMaxVideos:      true,
      geolocationFullAccess: true,
      qrCodeAccess:          true,
    },
  })
  return rows.map((r) => ({ ...r, price: Number(r.price) }))
}

export type SubscriptionRow = Awaited<ReturnType<typeof getActiveSubscriptions>>[number]
