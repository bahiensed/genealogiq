import 'server-only'

import { prisma } from '@/lib/prisma'

export async function getDashboardStats(customerId: string) {
  const now             = new Date()
  const startOfMonth    = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOf12Months = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  const [qrInventory, totalCustomers, monthlySales, last12MonthsSales] =
    await Promise.all([
      prisma.qrInventory.findUnique({
        where:  { tenantId: customerId },
        select: { quantity: true },
      }),
      prisma.appUser.count({
        where: { tenantId: customerId, role: 'APP_USER' },
      }),
      prisma.appSale.aggregate({
        where: { tenantId: customerId, createdAt: { gte: startOfMonth } },
        _count: true,
        _sum:   { value: true },
      }),
      prisma.appSale.findMany({
        where:  { tenantId: customerId, createdAt: { gte: startOf12Months } },
        select: {
          value:        true,
          createdAt:    true,
          subscription: { select: { name: true } },
        },
      }),
    ])

  // Monthly revenue chart — last 12 months
  const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const monthlyRevenueMap = new Map<string, number>()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthlyRevenueMap.set(`${d.getFullYear()}-${d.getMonth()}`, 0)
  }
  for (const s of last12MonthsSales) {
    const key  = `${s.createdAt.getFullYear()}-${s.createdAt.getMonth()}`
    const prev = monthlyRevenueMap.get(key) ?? 0
    monthlyRevenueMap.set(key, prev + Number(s.value))
  }
  const monthlyRevenueChart = Array.from(monthlyRevenueMap.entries()).map(([key, revenue]) => {
    const [, month] = key.split('-').map(Number)
    return { month: MONTH_LABELS[month], revenue: Math.round(revenue * 100) / 100 }
  })

  // Revenue by subscription plan chart
  const planRevenueMap = new Map<string, number>()
  for (const s of last12MonthsSales) {
    const name = s.subscription.name
    planRevenueMap.set(name, (planRevenueMap.get(name) ?? 0) + Number(s.value))
  }
  const revenueByPlanChart = Array.from(planRevenueMap.entries())
    .map(([name, revenue]) => ({ name, revenue: Math.round(revenue * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue)

  const monthlyCount   = monthlySales._count
  const monthlyRevenue = Number(monthlySales._sum.value ?? 0)

  return {
    availableQRCodes: qrInventory?.quantity ?? 0,
    totalCustomers,
    monthlyCount,
    monthlyRevenue,
    averageTicket: monthlyCount > 0 ? monthlyRevenue / monthlyCount : 0,
    monthlyRevenueChart,
    revenueByPlanChart,
  }
}
