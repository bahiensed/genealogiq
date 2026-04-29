import 'server-only'

import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'

export async function getLicenses() {
  await verifySession()

  const rows = await prisma.license.findMany({
    select: {
      id:          true,
      name:        true,
      description: true,
      maxProfiles: true,
      termLength:  true,
      price:       true,
      isActive:    true,
      createdAt:   true,
    },
    orderBy: { name: 'asc' },
  })

  return rows.map(r => ({ ...r, price: Number(r.price) }))
}

export async function getLicense(id: string) {
  await verifySession()

  const row = await prisma.license.findUnique({
    where: { id },
    select: {
      id:          true,
      name:        true,
      description: true,
      maxProfiles: true,
      termLength:  true,
      price:       true,
      isActive:    true,
    },
  })

  if (!row) return null
  return { ...row, price: Number(row.price) }
}
