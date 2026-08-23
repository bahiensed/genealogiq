import 'server-only'

import { prisma } from '@/lib/prisma'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// One row per (month, write-off channel). Three of the four charts and the
// three money KPIs all come from this single grouping — the tenant's revenue
// is recorded on the licence itself when they write it off, so there is
// nothing else to join.
type ChartRow = {
  month:    Date
  sold_via: string | null
  revenue:  string | null
  count:    bigint
}

type CustomerGrowthRow = {
  month: Date
  count: bigint
}

export async function getDashboardStats(customerId: string) {
  const now             = new Date()
  const startOfMonth    = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOf12Months = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  const [
    availableCodes,
    totalCustomers,
    monthlySales,
    chartRows,
    customerGrowth,
  ] = await Promise.all([
    // Stock is the count of unsold licences now that the digital counter is
    // gone — same number the tenant sees on /inventory/gencodes.
    prisma.genCode.count({
      where: { tenantId: customerId, status: 'AVAILABLE' },
    }),
    prisma.appUser.count({
      where: { tenantId: customerId, role: 'APP_USER' },
    }),
    // "Sold" is soldAt, not status: a code written off this month counts as
    // revenue now even if the buyer activates it next month (or never).
    prisma.genCode.aggregate({
      where:  { tenantId: customerId, soldAt: { gte: startOfMonth } },
      _count: true,
      _sum:   { soldValue: true },
    }),
    prisma.$queryRaw<ChartRow[]>`
      SELECT
        DATE_TRUNC('month', sold_at)  AS month,
        sold_via                      AS sold_via,
        COALESCE(SUM(sold_value), 0)  AS revenue,
        COUNT(*)                      AS count
      FROM gencodes
      WHERE tenant_id = ${customerId}
        AND sold_at IS NOT NULL
        AND sold_at >= ${startOf12Months}
      GROUP BY 1, 2
    `,
    prisma.$queryRaw<CustomerGrowthRow[]>`
      SELECT
        DATE_TRUNC('month', created_at) AS month,
        COUNT(*)                        AS count
      FROM app_users
      WHERE tenant_id = ${customerId}
        AND role = 'APP_USER'
        AND created_at >= ${startOf12Months}
      GROUP BY 1
    `,
  ])

  // Month spine
  const monthKeys: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthKeys.push(`${d.getFullYear()}-${d.getMonth()}`)
  }

  // One pass over the grouping feeds revenue-per-month, revenue-per-channel
  // and codes-sold-per-month.
  const monthlyRevenueMap = new Map<string, number>(monthKeys.map((k) => [k, 0]))
  const channelRevenueMap = new Map<string, number>()
  const soldPerMonthMap   = new Map<string, number>(monthKeys.map((k) => [k, 0]))
  for (const r of chartRows) {
    const key   = `${r.month.getFullYear()}-${r.month.getMonth()}`
    const value = Number(r.revenue ?? 0)
    monthlyRevenueMap.set(key, (monthlyRevenueMap.get(key) ?? 0) + value)
    soldPerMonthMap.set(key, (soldPerMonthMap.get(key) ?? 0) + Number(r.count ?? 0))
    // Null soldVia predates the write-off lifecycle; group it with the manual
    // channel rather than inventing a third bucket for two legacy rows.
    const channel = r.sold_via === 'PLATFORM' ? 'PLATFORM' : 'MANUAL'
    channelRevenueMap.set(channel, (channelRevenueMap.get(channel) ?? 0) + value)
  }

  const monthlyRevenueChart = monthKeys.map((key) => {
    const [, month] = key.split('-').map(Number)
    return { month: MONTH_LABELS[month], revenue: Math.round((monthlyRevenueMap.get(key) ?? 0) * 100) / 100 }
  })

  const revenueByChannelChart = Array.from(channelRevenueMap.entries())
    .map(([name, revenue]) => ({ name, revenue: Math.round(revenue * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue)

  // Customer growth chart with month spine
  const customerGrowthMap = new Map<string, number>(monthKeys.map((k) => [k, 0]))
  for (const r of customerGrowth) {
    const key = `${r.month.getFullYear()}-${r.month.getMonth()}`
    customerGrowthMap.set(key, Number(r.count ?? 0))
  }
  const customerGrowthChart = monthKeys.map((key) => {
    const [, month] = key.split('-').map(Number)
    return { month: MONTH_LABELS[month], count: customerGrowthMap.get(key) ?? 0 }
  })

  const qrConsumptionChart = monthKeys.map((key) => {
    const [, month] = key.split('-').map(Number)
    return { month: MONTH_LABELS[month], count: soldPerMonthMap.get(key) ?? 0 }
  })

  const monthlyCount   = monthlySales._count
  const monthlyRevenue = Number(monthlySales._sum.soldValue ?? 0)

  return {
    availableQRCodes: availableCodes,
    totalCustomers,
    monthlyCount,
    monthlyRevenue,
    averageTicket: monthlyCount > 0 ? monthlyRevenue / monthlyCount : 0,
    monthlyRevenueChart,
    revenueByChannelChart,
    customerGrowthChart,
    qrConsumptionChart,
  }
}
