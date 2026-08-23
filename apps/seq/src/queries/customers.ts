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

  return prisma.appUser.findMany({
    where:   { tenantId: customerId, role: 'APP_USER' },
    select: {
      id:        true,
      firstName: true,
      lastName:  true,
      email:     true,
      isActive:  true,
      createdAt: true,
      category:  { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function getCustomer(id: string) {
  const { customerId } = await verifyTenantSession()

  return prisma.appUser.findUnique({
    where:  { id, tenantId: customerId },
    select: {
      id:              true,
      firstName:       true,
      lastName:        true,
      gender:          true,
      birthDate:       true,
      birthCity:       true,
      birthState:      true,
      birthCountry:    true,
      email:           true,
      phoneCountryCode: true,
      phone:           true,
      categoryId:      true,
      notes:           true,
      isActive:        true,
      fb:              true,
      instagram:       true,
      linkedin:        true,
      tiktok:          true,
      x:               true,
      youtube:         true,
      otherSocial:     true,
      website:         true,
      address:         { select: addressSelect },
      _count: {
        select: {
          // GenCodes this customer bought from us. Only codes written off via
          // the platform channel carry the buyer link — a manual write-off
          // records a free-text name and cannot be attributed to a row here.
          genCodesBought: true,
          guardiansOf:         true,
        },
      },
      guardiansOf: {
        select: {
          appUser: {
            select: {
              id:        true,
              firstName: true,
              lastName:  true,
              birthDate: true,
              deathDate: true,
            },
          },
        },
      },
    },
  })
}
