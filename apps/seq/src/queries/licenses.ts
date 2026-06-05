import 'server-only'

import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'

export type LicenseStatus = 'AVAILABLE' | 'ACTIVATED'

export async function getLicenses(status?: LicenseStatus) {
  const { customerId } = await verifyTenantSession()

  return prisma.physicalQrLicense.findMany({
    where: {
      tenantId: customerId,
      ...(status ? { status } : {}),
    },
    select: {
      id:          true,
      genCode:     true,
      status:      true,
      activatedAt: true,
      createdAt:   true,
      appUser: {
        select: { firstName: true, lastName: true },
      },
      sale: {
        select: { id: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getLicenseSummary() {
  const { customerId } = await verifyTenantSession()

  const [total, activated] = await Promise.all([
    prisma.physicalQrLicense.count({ where: { tenantId: customerId } }),
    prisma.physicalQrLicense.count({ where: { tenantId: customerId, status: 'ACTIVATED' } }),
  ])

  return { total, activated, available: total - activated }
}

export type LicenseRow = Awaited<ReturnType<typeof getLicenses>>[number]
