import 'server-only'

import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'

export async function getSupplierCategories() {
  await verifySession()

  return prisma.supplierCategory.findMany({
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

export async function getSupplierCategory(id: string) {
  await verifySession()

  return prisma.supplierCategory.findUnique({
    where: { id },
    select: {
      id:          true,
      name:        true,
      description: true,
      isActive:    true,
    },
  })
}
