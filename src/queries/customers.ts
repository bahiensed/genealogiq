import 'server-only'

import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'

const addressSelect = {
  zip:          true,
  street:       true,
  number:       true,
  complement:   true,
  neighborhood: true,
  city:         true,
  state:        true,
  country:      true,
} as const

export async function getCustomers() {
  const { customerId } = await verifyTenantSession()

  return prisma.customer.findMany({
    where: { tenantId: customerId },
    select: {
      id:         true,
      entityType: true,
      name:       true,
      tradeName:  true,
      email:      true,
      isActive:   true,
      createdAt:  true,
      category:   { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function getCustomer(id: string) {
  const { customerId } = await verifyTenantSession()

  return prisma.customer.findUnique({
    where: { id, tenantId: customerId },
    select: {
      id:                    true,
      entityType:            true,
      name:                  true,
      tradeName:             true,
      taxId:                 true,
      stateRegistration:     true,
      municipalRegistration: true,
      birthDate:             true,
      email:                 true,
      phoneCountryCode:      true,
      phone:                 true,
      notes:                 true,
      categoryId:            true,
      isActive:              true,
      address:               { select: addressSelect },
    },
  })
}
