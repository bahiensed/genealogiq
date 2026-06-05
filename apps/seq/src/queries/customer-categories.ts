import 'server-only'

import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'

export async function getCustomerCategories() {
  const { customerId } = await verifyTenantSession()

  return prisma.appUserCategory.findMany({
    where:   { tenantId: customerId },
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
  const { customerId } = await verifyTenantSession()

  return prisma.appUserCategory.findUnique({
    where:  { id, tenantId: customerId },
    select: {
      id:          true,
      name:        true,
      description: true,
      isActive:    true,
    },
  })
}
