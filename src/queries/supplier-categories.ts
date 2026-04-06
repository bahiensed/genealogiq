import 'server-only'

import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'

export async function getSupplierCategories() {
  const { customerId } = await verifyTenantSession()

  return prisma.supplierCategory.findMany({
    where: { tenantId: customerId },
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
  const { customerId } = await verifyTenantSession()

  return prisma.supplierCategory.findUnique({
    where: { id, tenantId: customerId },
    select: {
      id:          true,
      name:        true,
      description: true,
      isActive:    true,
    },
  })
}
