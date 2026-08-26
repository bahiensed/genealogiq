import 'server-only'

import { prisma } from '@/lib/prisma'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
// Revenue is counted per CYCLE, not per contract: a contract can renew for
// years, and each renewal is its own income event.
//
// The amount comes from the cycle's frozen price_snapshot, which is the invoice
// Stripe actually charged, in cents. Nothing is recomputed from the plan's
// current price — that was the old model's bug, where editing a price silently
// rewrote the revenue history of every sale that carried no snapshot.
//
// A cycle only exists once an invoice was paid, so there is no "unpaid" state to
// filter out here: opening the cycle IS the settlement.


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
    totals,
    chartRows,
    topSellers,
    customerGrowth,
  ] = await Promise.all([
    prisma.subscription.count({ where: { isActive: true } }),
    prisma.partnerPlan.count({ where: { isActive: true } }),
    prisma.tenant.count(),
    prisma.user.count({ where: { tenantId: null } }),
    prisma.$queryRaw<SalesTotalsRow[]>`
      SELECT
        COUNT(c.id) FILTER (WHERE c.created_at >= ${startOfMonth}) AS monthly_count,
        COUNT(c.id) FILTER (WHERE c.created_at >= ${startOfYear})  AS yearly_count,
        COUNT(c.id)                                                AS total_count,
        COALESCE(SUM(COALESCE((c.price_snapshot->>'amountPaid')::numeric / 100, 0)) FILTER (WHERE c.created_at >= ${startOfMonth}), 0) AS monthly_revenue,
        COALESCE(SUM(COALESCE((c.price_snapshot->>'amountPaid')::numeric / 100, 0)) FILTER (WHERE c.created_at >= ${startOfYear}), 0)  AS yearly_revenue,
        COALESCE(SUM(COALESCE((c.price_snapshot->>'amountPaid')::numeric / 100, 0)), 0)                                                AS total_revenue
      FROM subscription_cycles c
    `,
    prisma.$queryRaw<ChartRow[]>`
      SELECT
        DATE_TRUNC('month', c.created_at) AS month,
        pp.name                           AS name,
        SUM(COALESCE((c.price_snapshot->>'amountPaid')::numeric / 100, 0))                 AS revenue
      FROM subscription_cycles c
      JOIN partner_plans pp ON pp.id = c.plan_id
      WHERE c.created_at >= ${startOf12Months}
      GROUP BY 1, 2
    `,
    // "Top sellers" now means top PARTNERS. Nobody sells a contract on a
    // partner's behalf any more — SEQ's self-serve checkout has no operator —
    // so ranking by seller would rank an empty column.
    prisma.$queryRaw<TopSellerRow[]>`
      SELECT
        s.tenant_id       AS seller_id,
        COUNT(c.id)       AS count,
        SUM(COALESCE((c.price_snapshot->>'amountPaid')::numeric / 100, 0)) AS revenue
      FROM subscription_cycles c
      JOIN partner_subscriptions s ON s.id = c.subscription_id
      WHERE c.created_at >= ${startOf12Months}
      GROUP BY s.tenant_id
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

  // Top partners — zip tenant_id → trade name
  const sellerIds = topSellers.map((s) => s.seller_id)
  const sellers   = sellerIds.length
    ? await prisma.tenant.findMany({
        where:  { id: { in: sellerIds } },
        select: { id: true, name: true },
      })
    : []
  const sellerMap = new Map(sellers.map((c) => [c.id, c.name]))
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
