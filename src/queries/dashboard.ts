import 'server-only'

import { prisma } from '@/lib/prisma'

export async function getDashboardStats(customerId: string) {
  const now          = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfYear  = new Date(now.getFullYear(), 0, 1)

  const [availableLicenses, totalCustomers, monthlySales, yearlySales] =
    await Promise.all([
      prisma.customerLicense.aggregate({
        where: { customerId },
        _sum:  { quantity: true },
      }),
      prisma.appUser.count({
        where: { tenantId: customerId },
      }),
      prisma.appSale.aggregate({
        where: { tenantId: customerId, soldAt: { gte: startOfMonth } },
        _count: true,
        _sum:   { value: true },
      }),
      prisma.appSale.aggregate({
        where: { tenantId: customerId, soldAt: { gte: startOfYear } },
        _count: true,
        _sum:   { value: true },
      }),
    ])

  return {
    availableLicenses: availableLicenses._sum.quantity ?? 0,
    totalCustomers,
    monthlyCount:   monthlySales._count,
    monthlyRevenue: Number(monthlySales._sum.value ?? 0),
    yearlyCount:    yearlySales._count,
    yearlyRevenue:  Number(yearlySales._sum.value ?? 0),
  }
}
