import 'server-only'

import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'

// Display order for the price cards. The catalogue is a fixed, seeded set of
// five (resource, tier) pairs, so it is listed explicitly rather than sorted:
// alphabetical put Memorial between Geolocation and GenCode, and Free above
// Premium, neither of which is how the pricing is read. A pair missing from
// this list still renders, after the ones named here.
const CARD_ORDER = [
  'GEO_PLACE:PREMIUM',
  'GEO_PLACE:FREE',
  'QR_CODE:PREMIUM',
  'QR_CODE:FREE',
  'MEMORIAL:PREMIUM',
] as const

function orderIndex(resource: string, tier: string): number {
  const i = CARD_ORDER.indexOf(`${resource}:${tier}` as (typeof CARD_ORDER)[number])
  return i === -1 ? CARD_ORDER.length : i
}

export async function getExtraUnitPrices() {
  await verifySession()

  const rows = await prisma.extraUnitPrice.findMany()

  rows.sort((a, b) =>
    orderIndex(a.resource, a.tier) - orderIndex(b.resource, b.tier) ||
    a.resource.localeCompare(b.resource) ||
    a.tier.localeCompare(b.tier),
  )

  return rows.map((r) => ({
    ...r,
    priceUsd: r.priceUsd ? Number(r.priceUsd) : null,
    priceBrl: r.priceBrl ? Number(r.priceBrl) : null,
    priceMxn: r.priceMxn ? Number(r.priceMxn) : null,
  }))
}

export type ExtraUnitPriceRow = Awaited<ReturnType<typeof getExtraUnitPrices>>[number]
