import 'server-only'

import { prisma } from '@/lib/prisma'

const SUGGESTED_MARKUP = 2 // 100% markup over cost per QR

/**
 * Suggested AppSale price per QR for this tenant, derived from the cost of
 * the last non-reversed Package purchase: (package.price / package.quantity)
 * × SUGGESTED_MARKUP. Returns null if the tenant has never bought a Package
 * (cold start) — the form shows no hint in that case.
 */
async function getSuggestedSalePrice(tenantId: string): Promise<number | null> {
  const lastSale = await prisma.sale.findFirst({
    where:   { tenantId, reversedAt: null },
    orderBy: { createdAt: 'desc' },
    select:  { package: { select: { price: true, quantity: true } } },
  })
  if (!lastSale || lastSale.package.quantity < 1) return null
  return (Number(lastSale.package.price) / lastSale.package.quantity) * SUGGESTED_MARKUP
}

export async function getInventoryData(customerId: string) {
  const [inventory, subscriptions, suggestedValue] = await Promise.all([
    prisma.qrInventory.findUnique({
      where: { tenantId: customerId },
      select: { quantity: true },
    }),
    prisma.subscription.findMany({
      where: { isActive: true },
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
    }),
    getSuggestedSalePrice(customerId),
  ])
  return {
    qrCodeCount: inventory?.quantity ?? 0,
    subscriptions,
    suggestedValue,
  }
}
