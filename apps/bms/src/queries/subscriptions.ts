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
  price:                true,
  monthlyPrice:         true,
  stripeProductId:      true,
  stripeAnnualPriceId:  true,
  stripeMonthlyPriceId: true,
  isActive:             true,
  createdAt:            true,
} as const

export async function getSubscriptions() {
  await verifySession()

  const rows = await prisma.subscription.findMany({
    select: subscriptionSelect,
    orderBy: { name: 'asc' },
  })

  return rows.map(r => ({ ...r, price: Number(r.price), monthlyPrice: r.monthlyPrice ? Number(r.monthlyPrice) : null }))
}

export async function getSubscription(id: string) {
  await verifySession()

  const row = await prisma.subscription.findUnique({
    where: { id },
    select: subscriptionSelect,
  })

  if (!row) return null
  return { ...row, price: Number(row.price), monthlyPrice: row.monthlyPrice ? Number(row.monthlyPrice) : null }
}
