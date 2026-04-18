import 'server-only'

import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'

export async function getLicenses() {
  await verifySession()

  return prisma.license.findMany({
    select: {
      id:          true,
      name:        true,
      description: true,
      isActive:    true,
      createdAt:   true,
    },
    orderBy: { name: 'asc' },
  })
}

export async function getLicense(id: string) {
  await verifySession()

  return prisma.license.findUnique({
    where: { id },
    select: {
      id:          true,
      name:        true,
      description: true,
      isActive:    true,
    },
  })
}
