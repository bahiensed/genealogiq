import 'server-only'

import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'

export async function getPackages(type?: 'PHYSICAL') {
  await verifySession()

  const rows = await prisma.package.findMany({
    where:   type ? { type } : undefined,
    select: {
      id:          true,
      name:        true,
      description: true,
      price:       true,
      quantity:    true,
      isActive:    true,
      type:        true,
      createdAt:   true,
    },
    orderBy: { name: 'asc' },
  })

  return rows.map(r => ({ ...r, price: Number(r.price) }))
}

export async function getActivePackages() {
  await verifySession()

  const rows = await prisma.package.findMany({
    where:   { isActive: true },
    select:  { id: true, name: true, price: true, quantity: true, type: true },
    orderBy: { name: 'asc' },
  })

  return rows.map(r => ({ ...r, price: Number(r.price) }))
}

export async function getPackage(id: string) {
  await verifySession()

  return prisma.package.findUnique({
    where: { id },
    select: {
      id:              true,
      name:            true,
      description:     true,
      price:           true,
      quantity:        true,
      isActive:        true,
      type:            true,
      stripeProductId: true,
      stripePriceId:   true,
    },
  })
}
