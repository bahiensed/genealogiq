import 'server-only'

import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'

export async function getDeceased(id: string) {
  const { customerId } = await verifyTenantSession()

  const record = await prisma.appUser.findUnique({
    where: { id, tenantId: customerId },
    select: {
      id:          true,
      firstName:   true,
      lastName:    true,
      gender:      true,
      birthDate:   true,
      birthCity:   true,
      birthState:  true,
      birthCountry: true,
      deathDate:   true,
      deathCause:  true,
      deathPlace:  true,
      deathState:  true,
      deathCountry: true,
      fb:          true,
      instagram:   true,
      linkedin:    true,
      tiktok:      true,
      x:           true,
      youtube:     true,
      otherSocial: true,
      website:     true,
      notes:       true,
      geolocation: {
        select: {
          lat:      true,
          lon:      true,
          date:     true,
          zip:      true,
          placeName: true,
          address:  true,
          section:  true,
          city:     true,
          state:    true,
          country:  true,
        },
      },
      qrCode: {
        select: {
          id:          true,
          url:         true,
          status:      true,
          printedAt:   true,
          installedAt: true,
        },
      },
    },
  })

  if (!record) return null

  const { deathPlace, geolocation, qrCode, ...rest } = record
  return {
    ...rest,
    qrCode,
    deathCity:          deathPlace         ?? '',
    burialDate:         geolocation?.date?.toISOString().slice(0, 10) ?? '',
    burialLatitude:     geolocation?.lat   ?? null,
    burialLongitude:    geolocation?.lon   ?? null,
    burialSite:         geolocation?.placeName ?? '',
    burialZip:          geolocation?.zip   ?? '',
    burialStreet:       geolocation?.address ?? '',
    burialNumber:       '',
    burialComplement:   '',
    burialNeighborhood: geolocation?.section ?? '',
    burialCity:         geolocation?.city  ?? '',
    burialState:        geolocation?.state ?? '',
    burialCountry:      geolocation?.country ?? '',
  }
}
