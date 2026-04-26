import 'server-only'

import { prisma } from '@/lib/prisma'

export async function getAvailableLicenses(customerId: string) {
  return prisma.tenantLicense.findMany({
    where: { tenantId: customerId, quantity: { gt: 0 } },
    select: {
      quantity: true,
      license:  { select: { id: true, name: true, description: true } },
    },
    orderBy: { license: { name: 'asc' } },
  })
}
