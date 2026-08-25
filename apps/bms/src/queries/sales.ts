import 'server-only'

import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'

export async function getSales() {
  await verifySession()

  const rows = await prisma.sale.findMany({
    select: {
      id:             true,
      quantity:       true,
      paidAt:         true,
      expiredAt:      true,
      failedAt:       true,
      reversedAt:     true,
      createdAt:      true,
      amountTotal:    true,
      currency:       true,
      checkoutUrl:    true,
      discountCoupon: { select: { code: true } },
      package: {
        select: { name: true, price: true, quantity: true },
      },
      tenant: {
        select: { name: true },
      },
      soldBy: {
        select: { firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return rows.map(r => ({ ...r, package: { ...r.package, price: Number(r.package.price) } }))
}
