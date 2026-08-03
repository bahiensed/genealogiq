import "server-only"

import { prisma } from "@/lib/prisma"

export async function getActiveSubscriptions() {
  const rows = await prisma.subscription.findMany({
    // Self-serve checkout only ever offers the plans this app actually sells
    // this way — a physical-QR license or any other admin-created row is
    // sold/tracked through a different channel, not this page.
    where:   { isActive: true, code: { in: ["FREE", "PREMIUM"] } },
    orderBy: { price: "asc" },
    select: {
      id:                    true,
      code:                  true,
      name:                  true,
      description:           true,
      maxProfiles:           true,
      termLength:            true,
      price:                 true,
      monthlyPrice:          true,
      treeMaxMembers:        true,
      bioMaxChars:           true,
      mediaMaxImages:        true,
      mediaMaxVideos:        true,
      documentsMax:          true,
      geoPlacesMax:          true,
      memorialsMax:          true,
      petsMax:               true,
      qrCodeMax:             true,
      geolocationFullAccess: true,
    },
  })
  return rows.map((r) => ({
    ...r,
    price:        Number(r.price),
    monthlyPrice: r.monthlyPrice ? Number(r.monthlyPrice) : null,
    quotas: {
      code:                  r.code,
      treeMaxMembers:        r.treeMaxMembers,
      bioMaxChars:           r.bioMaxChars,
      mediaMaxImages:        r.mediaMaxImages,
      mediaMaxVideos:        r.mediaMaxVideos,
      documentsMax:          r.documentsMax,
      geoPlacesMax:          r.geoPlacesMax,
      memorialsMax:          r.memorialsMax,
      petsMax:               r.petsMax,
      qrCodeMax:             r.qrCodeMax,
      geolocationFullAccess: r.geolocationFullAccess,
    },
  }))
}

export type SubscriptionRow = Awaited<ReturnType<typeof getActiveSubscriptions>>[number]
