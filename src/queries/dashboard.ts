import 'server-only'

import { prisma } from '@/lib/prisma'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type ChartRow = {
  month:           Date
  subscription_id: string
  revenue:         string | null
}

type CustomerGrowthRow = {
  month: Date
  count: bigint
}

type QrConsumptionRow = {
  month: Date
  count: bigint
}

export async function getDashboardStats(customerId: string) {
  const now             = new Date()
  const startOfMonth    = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOf12Months = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  const [
    qrInventory,
    totalCustomers,
    monthlySales,
    chartRows,
    customerGrowth,
    qrConsumption,
  ] = await Promise.all([
    prisma.qrInventory.findUnique({
      where:  { tenantId: customerId },
      select: { quantity: true },
    }),
    prisma.appUser.count({
      where: { tenantId: customerId, role: 'APP_USER' },
    }),
    prisma.appSale.aggregate({
      where:  { tenantId: customerId, createdAt: { gte: startOfMonth } },
      _count: true,
      _sum:   { value: true },
    }),
    prisma.$queryRaw<ChartRow[]>`
      SELECT
        DATE_TRUNC('month', created_at) AS month,
        subscription_id                 AS subscription_id,
        SUM(value)                      AS revenue
      FROM app_sales
      WHERE tenant_id = ${customerId}
        AND created_at >= ${startOf12Months}
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
    prisma.$queryRaw<QrConsumptionRow[]>`
      SELECT
        DATE_TRUNC('month', created_at) AS month,
        COUNT(*)                        AS count
      FROM app_sales
      WHERE tenant_id = ${customerId}
        AND created_at >= ${startOf12Months}
      GROUP BY 1
    `,
  ])

  // Subscription name lookup for revenue-by-plan chart
  const subIds = Array.from(new Set(chartRows.map((r) => r.subscription_id)))
  const subscriptions = subIds.length
    ? await prisma.subscription.findMany({
        where:  { id: { in: subIds } },
        select: { id: true, name: true },
      })
    : []
  const subNameMap = new Map(subscriptions.map((s) => [s.id, s.name]))

  // Month spine
  const monthKeys: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthKeys.push(`${d.getFullYear()}-${d.getMonth()}`)
  }

  const monthlyRevenueMap = new Map<string, number>(monthKeys.map((k) => [k, 0]))
  const planRevenueMap    = new Map<string, number>()
  for (const r of chartRows) {
    const key = `${r.month.getFullYear()}-${r.month.getMonth()}`
    const value = Number(r.revenue ?? 0)
    monthlyRevenueMap.set(key, (monthlyRevenueMap.get(key) ?? 0) + value)
    const planName = subNameMap.get(r.subscription_id) ?? 'Unknown'
    planRevenueMap.set(planName, (planRevenueMap.get(planName) ?? 0) + value)
  }

  const monthlyRevenueChart = monthKeys.map((key) => {
    const [, month] = key.split('-').map(Number)
    return { month: MONTH_LABELS[month], revenue: Math.round((monthlyRevenueMap.get(key) ?? 0) * 100) / 100 }
  })

  const revenueByPlanChart = Array.from(planRevenueMap.entries())
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

  // QR consumption chart with month spine
  const qrConsumptionMap = new Map<string, number>(monthKeys.map((k) => [k, 0]))
  for (const r of qrConsumption) {
    const key = `${r.month.getFullYear()}-${r.month.getMonth()}`
    qrConsumptionMap.set(key, Number(r.count ?? 0))
  }
  const qrConsumptionChart = monthKeys.map((key) => {
    const [, month] = key.split('-').map(Number)
    return { month: MONTH_LABELS[month], count: qrConsumptionMap.get(key) ?? 0 }
  })

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
    customerGrowthChart,
    qrConsumptionChart,
  }
}
