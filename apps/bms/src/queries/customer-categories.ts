import 'server-only'

import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'

export async function getCustomerCategories() {
  await verifySession()

  return prisma.tenantCategory.findMany({
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

export async function getCustomerCategory(id: string) {
  await verifySession()

  return prisma.tenantCategory.findUnique({
    where: { id },
    select: {
      id:          true,
      name:        true,
      description: true,
      isActive:    true,
    },
  })
}
