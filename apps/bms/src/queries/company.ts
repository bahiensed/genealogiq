import 'server-only'

import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'

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
  await verifySession()

  return prisma.company.findFirst({
    select: {
      id:                    true,
      legalName:             true,
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
}
