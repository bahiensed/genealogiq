import 'server-only'

import { prisma } from '@/lib/prisma'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type SalesTotalsRow = {
  monthly_count:   bigint
  yearly_count:    bigint
  total_count:     bigint
  monthly_revenue: string | null
  yearly_revenue:  string | null
  total_revenue:   string | null
}

type ChartRow = {
  month: Date
  name:  string
  revenue: string | null
}

type TopSellerRow = {
  seller_id: string
  count:     bigint
  revenue:   string | null
}

type CustomerGrowthRow = {
  month: Date
  count: bigint
}

export async function getDashboardStats() {
  const now             = new Date()
  const startOfMonth    = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfYear     = new Date(now.getFullYear(), 0, 1)
  const startOf12Months = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  const [
    subscriptions,
    packages,
    customers,
    systemUsers,
    suppliers,
    totals,
    chartRows,
    topSellers,
    customerGrowth,
  ] = await Promise.all([
    prisma.subscription.count({ where: { isActive: true } }),
    prisma.package.count({ where: { isActive: true } }),
    prisma.tenant.count(),
    prisma.user.count({ where: { tenantId: null } }),
    prisma.supplier.count(),
    prisma.$queryRaw<SalesTotalsRow[]>`
      SELECT
        COUNT(s.id) FILTER (WHERE s.created_at >= ${startOfMonth})              AS monthly_count,
        COUNT(s.id) FILTER (WHERE s.created_at >= ${startOfYear})               AS yearly_count,
        COUNT(s.id)                                                             AS total_count,
        COALESCE(SUM(s.quantity * p.price) FILTER (WHERE s.created_at >= ${startOfMonth}), 0) AS monthly_revenue,
        COALESCE(SUM(s.quantity * p.price) FILTER (WHERE s.created_at >= ${startOfYear}), 0)  AS yearly_revenue,
        COALESCE(SUM(s.quantity * p.price), 0)                                                AS total_revenue
      FROM sales s
      JOIN packages p ON s.package_id = p.id
      WHERE s.reversed_at IS NULL
    `,
    prisma.$queryRaw<ChartRow[]>`
      SELECT
        DATE_TRUNC('month', s.created_at) AS month,
        p.name                            AS name,
        SUM(s.quantity * p.price)         AS revenue
      FROM sales s
      JOIN packages p ON s.package_id = p.id
      WHERE s.reversed_at IS NULL
        AND s.created_at >= ${startOf12Months}
      GROUP BY 1, 2
    `,
    prisma.$queryRaw<TopSellerRow[]>`
      SELECT
        s.sold_by_id              AS seller_id,
        COUNT(s.id)               AS count,
        SUM(s.quantity * p.price) AS revenue
      FROM sales s
      JOIN packages p ON s.package_id = p.id
      WHERE s.reversed_at IS NULL
        AND s.created_at >= ${startOf12Months}
      GROUP BY s.sold_by_id
      ORDER BY revenue DESC NULLS LAST
      LIMIT 5
    `,
    prisma.$queryRaw<CustomerGrowthRow[]>`
      SELECT
        DATE_TRUNC('month', created_at) AS month,
        COUNT(*)                        AS count
      FROM tenants
      WHERE created_at >= ${startOf12Months}
      GROUP BY 1
    `,
  ])

  // Totals
  const t = totals[0]
  const monthlyCount   = Number(t?.monthly_count   ?? 0)
  const yearlyCount    = Number(t?.yearly_count    ?? 0)
  const totalCount     = Number(t?.total_count     ?? 0)
  const monthlyRevenue = Number(t?.monthly_revenue ?? 0)
  const yearlyRevenue  = Number(t?.yearly_revenue  ?? 0)
  const totalRevenue   = Number(t?.total_revenue   ?? 0)

  // Month spine for chart
  const monthKeys: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthKeys.push(`${d.getFullYear()}-${d.getMonth()}`)
  }

  const monthlyRevenueMap   = new Map<string, number>(monthKeys.map((k) => [k, 0]))
  const packageRevenueMap   = new Map<string, number>()
  for (const r of chartRows) {
    const key = `${r.month.getFullYear()}-${r.month.getMonth()}`
    const value = Number(r.revenue ?? 0)
    monthlyRevenueMap.set(key, (monthlyRevenueMap.get(key) ?? 0) + value)
    packageRevenueMap.set(r.name, (packageRevenueMap.get(r.name) ?? 0) + value)
  }

  const monthlyRevenueChart = monthKeys.map((key) => {
    const [, month] = key.split('-').map(Number)
    return { month: MONTH_LABELS[month], revenue: Math.round((monthlyRevenueMap.get(key) ?? 0) * 100) / 100 }
  })

  const revenueByPackageChart = Array.from(packageRevenueMap.entries())
    .map(([name, revenue]) => ({ name, revenue: Math.round(revenue * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue)

  // Top sellers — zip seller_id → user name
  const sellerIds = topSellers.map((s) => s.seller_id)
  const sellers   = sellerIds.length
    ? await prisma.user.findMany({
        where:  { id: { in: sellerIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : []
  const sellerMap = new Map(sellers.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]))
  const topSellersChart = topSellers.map((s) => ({
    name:    sellerMap.get(s.seller_id) ?? 'Unknown',
    count:   Number(s.count ?? 0),
    revenue: Math.round(Number(s.revenue ?? 0) * 100) / 100,
  }))

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

  return {
    subscriptions,
    packages,
    customers,
    systemUsers,
    suppliers,
    monthlyCount,
    monthlyRevenue,
    yearlyCount,
    yearlyRevenue,
    totalCount,
    totalRevenue,
    monthlyRevenueChart,
    revenueByPackageChart,
    topSellersChart,
    customerGrowthChart,
  }
}
