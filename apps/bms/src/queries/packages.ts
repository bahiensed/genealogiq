import 'server-only'

import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'
import type { AppCurrency } from '@genealogiq/core'

const PRICE_ID_BY_CURRENCY = {
  usd: 'stripeAnnualPriceIdUsd',
  brl: 'stripeAnnualPriceIdBrl',
  mxn: 'stripeAnnualPriceIdMxn',
} as const

const PRICE_BY_CURRENCY = {
  usd: 'priceUsd',
  brl: 'priceBrl',
  mxn: 'priceMxn',
} as const

const PRICE_SELECT = {
  termLength: true,
  priceUsd: true, monthlyPriceUsd: true,
  priceBrl: true, monthlyPriceBrl: true,
  priceMxn: true, monthlyPriceMxn: true,
  stripeAnnualPriceIdUsd:  true, stripeMonthlyPriceIdUsd: true,
  stripeAnnualPriceIdBrl:  true, stripeMonthlyPriceIdBrl: true,
  stripeAnnualPriceIdMxn:  true, stripeMonthlyPriceIdMxn: true,
} as const

export async function getPackages() {
  await verifySession()

  const rows = await prisma.package.findMany({
    select: {
      id:          true,
      name:        true,
      description: true,
      quantity:    true,
      isActive:    true,
      createdAt:   true,
      ...PRICE_SELECT,
    },
    orderBy: { name: 'asc' },
  })

  return rows.map((r) => ({
    ...r,
    priceUsd: r.priceUsd === null ? null : Number(r.priceUsd),
    priceBrl: r.priceBrl === null ? null : Number(r.priceBrl),
    priceMxn: r.priceMxn === null ? null : Number(r.priceMxn),
    monthlyPriceUsd: r.monthlyPriceUsd === null ? null : Number(r.monthlyPriceUsd),
    monthlyPriceBrl: r.monthlyPriceBrl === null ? null : Number(r.monthlyPriceBrl),
    monthlyPriceMxn: r.monthlyPriceMxn === null ? null : Number(r.monthlyPriceMxn),
  }))
}

/**
 * Products sellable in this currency — priced AND synced in it. A product with
 * only a dollar price does not appear in the Portuguese interface, because
 * choosing it there would fail at checkout with nothing to charge.
 */
export async function getActivePackages(currency: AppCurrency) {
  await verifySession()

  const rows = await prisma.package.findMany({
    where: {
      isActive: true,
      [PRICE_ID_BY_CURRENCY[currency]]: { not: null },
      [PRICE_BY_CURRENCY[currency]]:    { gt: 0 },
    },
    select:  { id: true, name: true, quantity: true, ...PRICE_SELECT },
    orderBy: { name: 'asc' },
  })

  const MONTHLY_BY_CURRENCY = { usd: 'monthlyPriceUsd', brl: 'monthlyPriceBrl', mxn: 'monthlyPriceMxn' } as const
  const MONTHLY_ID_BY_CURRENCY = { usd: 'stripeMonthlyPriceIdUsd', brl: 'stripeMonthlyPriceIdBrl', mxn: 'stripeMonthlyPriceIdMxn' } as const

  return rows.map((r) => ({
    id:         r.id,
    name:       r.name,
    quantity:   r.quantity,
    termLength: r.termLength,
    price:      Number(r[PRICE_BY_CURRENCY[currency]]),
    // Only offered as an instalment plan when the amount AND its Stripe Price
    // both exist — offering one we cannot charge would fail at checkout.
    monthlyPrice: r[MONTHLY_BY_CURRENCY[currency]] !== null && r[MONTHLY_ID_BY_CURRENCY[currency]]
      ? Number(r[MONTHLY_BY_CURRENCY[currency]])
      : null,
  }))
}

export async function getPackage(id: string) {
  await verifySession()

  return prisma.package.findUnique({
    where: { id },
    select: {
      id:              true,
      name:            true,
      description:     true,
      quantity:        true,
      isActive:        true,
      stripeProductId: true,
      ...PRICE_SELECT,
    },
  })
}
