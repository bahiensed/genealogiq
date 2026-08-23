import 'server-only'

import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'

const subscriptionSelect = {
  id:                   true,
  code:                 true,
  name:                 true,
  description:          true,
  maxProfiles:          true,
  termLength:           true,
  priceUsd:             true,
  monthlyPriceUsd:      true,
  priceBrl:             true,
  monthlyPriceBrl:      true,
  priceMxn:             true,
  monthlyPriceMxn:      true,
  treeMaxMembers:        true,
  bioMaxChars:           true,
  mediaMaxImages:        true,
  mediaMaxVideos:        true,
  documentsMax:          true,
  geoPlacesMax:          true,
  memorialsMax:          true,
  petsMax:               true,
  qrCodeMax:             true,
  stripeProductId:         true,
  stripeAnnualPriceIdUsd:  true,
  stripeMonthlyPriceIdUsd: true,
  stripeAnnualPriceIdBrl:  true,
  stripeMonthlyPriceIdBrl: true,
  stripeAnnualPriceIdMxn:  true,
  stripeMonthlyPriceIdMxn: true,
  isActive:             true,
  createdAt:            true,
} as const

function toDecimalNumber(value: { toNumber: () => number } | null): number | null {
  return value ? Number(value) : null
}

// List view — only USD is shown (avoids a 6-number-wide table); the edit
// page shows all 3 currencies in full.
export async function getSubscriptions() {
  await verifySession()

  const rows = await prisma.subscription.findMany({
    select: subscriptionSelect,
    orderBy: { name: 'asc' },
  })

  return rows.map(r => ({
    id: r.id, code: r.code, name: r.name, description: r.description,
    maxProfiles: r.maxProfiles, termLength: r.termLength, isActive: r.isActive, createdAt: r.createdAt,
    priceUsd: Number(r.priceUsd),
  }))
}

export async function getSubscription(id: string) {
  await verifySession()

  const row = await prisma.subscription.findUnique({
    where: { id },
    select: subscriptionSelect,
  })

  if (!row) return null
  return {
    ...row,
    priceUsd:        Number(row.priceUsd),
    monthlyPriceUsd: toDecimalNumber(row.monthlyPriceUsd),
    priceBrl:        toDecimalNumber(row.priceBrl),
    monthlyPriceBrl: toDecimalNumber(row.monthlyPriceBrl),
    priceMxn:        toDecimalNumber(row.priceMxn),
    monthlyPriceMxn: toDecimalNumber(row.monthlyPriceMxn),
  }
}
