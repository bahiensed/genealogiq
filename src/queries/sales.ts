import 'server-only'

import { prisma } from '@/lib/prisma'

export async function getInventoryData(customerId: string) {
  const [inventory, subscriptions] = await Promise.all([
    prisma.qrInventory.findUnique({
      where: { tenantId: customerId },
      select: { quantity: true },
    }),
    prisma.subscription.findMany({
      where: { isActive: true },
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
    }),
  ])
  return {
    qrCodeCount: inventory?.quantity ?? 0,
    subscriptions,
  }
}
