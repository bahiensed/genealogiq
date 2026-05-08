import 'server-only'

import { prisma } from '@/lib/prisma'

export async function getDashboardStats() {
  const now          = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfYear  = new Date(now.getFullYear(), 0, 1)

  // 12 full months back (first day of month 11 months ago)
  const startOf12Months = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  const [
    subscriptions,
    packages,
    customers,
    systemUsers,
    suppliers,
    monthlySales,
    yearlySales,
    allSales,
    last12MonthsSales,
  ] = await Promise.all([
    prisma.subscription.count({ where: { isActive: true } }),
    prisma.package.count({ where: { isActive: true } }),
    prisma.tenant.count(),
    prisma.user.count({ where: { tenantId: null } }),
    prisma.supplier.count(),
    prisma.sale.findMany({
      where:  { createdAt: { gte: startOfMonth }, reversedAt: null },
      select: { quantity: true, package: { select: { price: true } } },
    }),
    prisma.sale.findMany({
      where:  { createdAt: { gte: startOfYear }, reversedAt: null },
      select: { quantity: true, package: { select: { price: true } } },
    }),
    prisma.sale.findMany({
      where:  { reversedAt: null },
      select: { quantity: true, package: { select: { price: true } } },
    }),
    prisma.sale.findMany({
      where:  { createdAt: { gte: startOf12Months }, reversedAt: null },
      select: {
        quantity:  true,
        createdAt: true,
        package:   { select: { name: true, price: true } },
      },
    }),
  ])

  const toRevenue = (rows: { quantity: number; package: { price: unknown } }[]) =>
    rows.reduce((sum, s) => sum + s.quantity * Number(s.package.price), 0)

  // Monthly revenue chart — last 12 months
  const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const monthlyRevenueMap = new Map<string, number>()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthlyRevenueMap.set(`${d.getFullYear()}-${d.getMonth()}`, 0)
  }
  for (const s of last12MonthsSales) {
    const key = `${s.createdAt.getFullYear()}-${s.createdAt.getMonth()}`
    const prev = monthlyRevenueMap.get(key) ?? 0
    monthlyRevenueMap.set(key, prev + s.quantity * Number(s.package.price))
  }
  const monthlyRevenueChart = Array.from(monthlyRevenueMap.entries()).map(([key, revenue]) => {
    const [year, month] = key.split('-').map(Number)
    return { month: MONTH_LABELS[month], revenue: Math.round(revenue * 100) / 100 }
  })

  // Revenue by package chart
  const packageRevenueMap = new Map<string, number>()
  for (const s of last12MonthsSales) {
    const prev = packageRevenueMap.get(s.package.name) ?? 0
    packageRevenueMap.set(s.package.name, prev + s.quantity * Number(s.package.price))
  }
  const revenueByPackageChart = Array.from(packageRevenueMap.entries())
    .map(([name, revenue]) => ({ name, revenue: Math.round(revenue * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue)

  return {
    subscriptions,
    packages,
    customers,
    systemUsers,
    suppliers,
    monthlyCount:          monthlySales.length,
    monthlyRevenue:        toRevenue(monthlySales),
    yearlyCount:           yearlySales.length,
    yearlyRevenue:         toRevenue(yearlySales),
    totalCount:            allSales.length,
    totalRevenue:          toRevenue(allSales),
    monthlyRevenueChart,
    revenueByPackageChart,
  }
}
