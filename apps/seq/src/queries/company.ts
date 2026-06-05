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

export async function getCompany() {
  const { customerId } = await verifyTenantSession()

  const customer = await prisma.tenant.findUnique({
    where: { id: customerId },
    select: {
      id:                    true,
      name:                  true,
      tradeName:             true,
      taxId:                 true,
      stateRegistration:     true,
      municipalRegistration: true,
      email:                 true,
      phoneCountryCode:      true,
      phone:                 true,
      isActive:              true,
      address:               { select: addressSelect },
    },
  })

  if (!customer) return null

  // Map Customer.name → legalName to match the company form schema
  const { name: legalName, ...rest } = customer
  return { legalName, ...rest }
}
