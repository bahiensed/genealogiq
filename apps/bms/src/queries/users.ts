import 'server-only'

import { prisma } from '@/lib/prisma'
import { verifySession, canViewSensitive, REDACTED } from '@/lib/dal'

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
  await verifySession()

  return prisma.user.findMany({
    where: { tenantId: null },
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
  const privileged = await canViewSensitive()

  const row = await prisma.user.findUnique({
    where: { id },
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

  if (!row || privileged) return row

  // M3: redact third-party PII for non-privileged roles (navigation preserved).
  return {
    ...row,
    nationalId: row.nationalId ? REDACTED : null,
    phone:      row.phone ? REDACTED : null,
    address:    null,
  }
}
