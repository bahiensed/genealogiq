import 'server-only'

import { prisma } from '@/lib/prisma'

export async function getAvailableLicenses(customerId: string) {
  return prisma.customerLicense.findMany({
    where: { customerId, quantity: { gt: 0 } },
    select: {
      quantity: true,
      license:  { select: { id: true, component: true, description: true } },
    },
    orderBy: { license: { component: 'asc' } },
  })
}
