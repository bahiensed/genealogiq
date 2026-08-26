import 'server-only'

import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'

const subscriptionSelect = {
  id:                   true,
  code:                 true,
  name:                 true,
  description:          true,
  termLength:           true,
  treeMaxMembers:        true,
  bioMaxChars:           true,
  mediaMaxImages:        true,
  mediaMaxVideos:        true,
  documentsMax:          true,
  geoPlacesMax:          true,
  memorialsMax:          true,
  petsMax:               true,
  qrCodeMax:             true,
  isActive:             true,
  createdAt:            true,
  // The versioned price book replaced the per-currency columns. Same reason as
  // the partner plans: an amount edited in place rewrites what every past sale
  // was charged.
  prices: {
    where:   { isActive: true, effectiveTo: null },
    select:  {
      id: true, currency: true, countryScope: true,
      annualCashAmount: true, installmentCount: true, installmentAmount: true,
      version: true, stripeProductId: true,
      stripeCashPriceId: true, stripeInstallmentPriceId: true,
    },
    orderBy: { currency: 'asc' as const },
  },
} as const

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
    termLength: r.termLength, isActive: r.isActive, createdAt: r.createdAt,
    // USD only in the list — six numbers would not fit; the edit page shows the
    // whole book. A free tier carries no price row and reads as zero.
    priceUsd: Number(r.prices.find(p => p.currency === 'USD')?.annualCashAmount ?? 0),
  }))
}

export async function getSubscription(id: string) {
  await verifySession()

  const row = await prisma.subscription.findUnique({
    where: { id },
    select: subscriptionSelect,
  })

  if (!row) return null

  const by = (code: string) => row.prices.find((p) => p.currency === code)
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v))

  return {
    ...row,
    // Flattened per currency for the form, which edits one row per currency.
    // Reconciling that back into versions is updateSubscription's job.
    priceUsd:        Number(by('USD')?.annualCashAmount ?? 0),
    monthlyPriceUsd: num(by('USD')?.installmentAmount),
    priceBrl:        num(by('BRL')?.annualCashAmount),
    monthlyPriceBrl: num(by('BRL')?.installmentAmount),
    priceMxn:        num(by('MXN')?.annualCashAmount),
    monthlyPriceMxn: num(by('MXN')?.installmentAmount),
    stripeProductId: row.prices.find((p) => p.stripeProductId)?.stripeProductId ?? null,
    stripeAnnualPriceIdUsd:  by('USD')?.stripeCashPriceId ?? null,
    stripeMonthlyPriceIdUsd: by('USD')?.stripeInstallmentPriceId ?? null,
    stripeAnnualPriceIdBrl:  by('BRL')?.stripeCashPriceId ?? null,
    stripeMonthlyPriceIdBrl: by('BRL')?.stripeInstallmentPriceId ?? null,
    stripeAnnualPriceIdMxn:  by('MXN')?.stripeCashPriceId ?? null,
    stripeMonthlyPriceIdMxn: by('MXN')?.stripeInstallmentPriceId ?? null,
  }
}
