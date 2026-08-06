import 'server-only'

import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'

export async function getExtraUnitPrices() {
  await verifySession()

  const rows = await prisma.extraUnitPrice.findMany({
    orderBy: [{ resource: 'asc' }, { tier: 'asc' }],
  })

  return rows.map((r) => ({
    ...r,
    priceUsd: r.priceUsd ? Number(r.priceUsd) : null,
    priceBrl: r.priceBrl ? Number(r.priceBrl) : null,
    priceMxn: r.priceMxn ? Number(r.priceMxn) : null,
  }))
}

export type ExtraUnitPriceRow = Awaited<ReturnType<typeof getExtraUnitPrices>>[number]
