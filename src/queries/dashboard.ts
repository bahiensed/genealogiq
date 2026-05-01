import 'server-only'

import { prisma } from '@/lib/prisma'

export async function getDashboardStats() {
  const now          = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfYear  = new Date(now.getFullYear(), 0, 1)

  const [
    subscriptions,
    packages,
    customers,
    systemUsers,
    suppliers,
    monthlySales,
    yearlySales,
    allSales,
  ] = await Promise.all([
    prisma.subscription.count({ where: { isActive: true } }),
    prisma.package.count({ where: { isActive: true } }),
    prisma.tenant.count(),
    prisma.user.count({ where: { tenantId: null } }),
    prisma.supplier.count(),
    prisma.sale.findMany({
      where:  { createdAt: { gte: startOfMonth } },
      select: { quantity: true, package: { select: { price: true } } },
    }),
    prisma.sale.findMany({
      where:  { createdAt: { gte: startOfYear } },
      select: { quantity: true, package: { select: { price: true } } },
    }),
    prisma.sale.findMany({
      select: { quantity: true, package: { select: { price: true } } },
    }),
  ])

  const toRevenue = (rows: { quantity: number; package: { price: unknown } }[]) =>
    rows.reduce((sum, s) => sum + s.quantity * Number(s.package.price), 0)

  return {
    subscriptions,
    packages,
    customers,
    systemUsers,
    suppliers,
    monthlyCount:   monthlySales.length,
    monthlyRevenue: toRevenue(monthlySales),
    yearlyCount:    yearlySales.length,
    yearlyRevenue:  toRevenue(yearlySales),
    totalCount:     allSales.length,
    totalRevenue:   toRevenue(allSales),
  }
}
