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

export async function getUsers() {
  const { customerId } = await verifyTenantSession()

  return prisma.user.findMany({
    where: { tenantId: customerId },
    select: {
      id:        true,
      firstName: true,
      lastName:  true,
      email:     true,
      role:      true,
      isActive:  true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function getUser(id: string) {
  const { customerId } = await verifyTenantSession()

  return prisma.user.findUnique({
    where: { id, tenantId: customerId },
    select: {
      id:               true,
      firstName:        true,
      lastName:         true,
      email:            true,
      role:             true,
      nationalId:       true,
      birthDate:        true,
      phoneCountryCode: true,
      phone:            true,
      isActive:         true,
      address:          { select: addressSelect },
    },
  })
}
