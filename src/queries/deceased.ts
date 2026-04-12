import 'server-only'

import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'

export async function getDeceased(id: string) {
  const { customerId } = await verifyTenantSession()

  return prisma.deceased.findUnique({
    where: { id, tenantId: customerId },
    select: {
      id:                 true,
      firstName:          true,
      lastName:           true,
      gender:             true,
      birthDate:          true,
      birthCity:          true,
      birthState:         true,
      birthCountry:       true,
      deathDate:          true,
      deathCause:         true,
      deathCity:          true,
      deathState:         true,
      deathCountry:       true,
      burialDate:         true,
      burialLatitude:     true,
      burialLongitude:    true,
      burialSite:         true,
      burialZip:          true,
      burialStreet:       true,
      burialNumber:       true,
      burialComplement:   true,
      burialNeighborhood: true,
      burialCity:         true,
      burialState:        true,
      burialCountry:      true,
      fb:                 true,
      instagram:          true,
      linkedin:           true,
      tiktok:             true,
      x:                  true,
      youtube:            true,
      outro:              true,
      website:            true,
      notes:              true,
    },
  })
}
