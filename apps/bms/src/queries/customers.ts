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

export async function getCustomers() {
  await verifySession()

  return prisma.tenant.findMany({
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
  const privileged = await canViewSensitive()

  const row = await prisma.tenant.findUnique({
    where: { id },
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
      moduleRecordsSuppliers:    true,
      moduleCategoriesSuppliers: true,
      address:               { select: addressSelect },
    },
  })

  if (!row || privileged) return row

  // M3: redact third-party PII for non-privileged roles (navigation preserved).
  return {
    ...row,
    taxId:                 REDACTED,
    stateRegistration:     row.stateRegistration ? REDACTED : null,
    municipalRegistration: row.municipalRegistration ? REDACTED : null,
    phone:                 REDACTED,
    notes:                 row.notes ? REDACTED : null,
    address:               null,
  }
}

export async function getActiveCustomers() {
  await verifySession()

  return prisma.tenant.findMany({
    where:   { isActive: true },
    select:  { id: true, entityType: true, name: true, tradeName: true },
    orderBy: { name: 'asc' },
  })
}
