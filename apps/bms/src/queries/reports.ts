import 'server-only'

import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'

/**
 * Sales reporting over the GenCode lifecycle.
 *
 * Every number here comes from a state the system actually records, so the
 * report can be trusted against the database rather than describing an
 * intention. Two properties of the data shape what can honestly be reported:
 *
 * - **Our B2B revenue is derived, not snapshotted.** `Sale` stores quantity and
 *   a package reference but no price, so revenue is recomputed as
 *   `quantity × package.price`. Editing a package's price therefore rewrites
 *   history. The page says so rather than presenting it as booked revenue.
 * - **Reseller revenue is only known when they record it.** `soldValue` is
 *   optional on a manual write-off, so the resale total is a floor, never a
 *   total.
 */

/** A code written off this long ago and still unredeemed is worth chasing. */
export const STALE_AFTER_DAYS = 30

export interface GenCodeFunnel {
  issued:    number
  sold:      number
  activated: number
  available: number
  /** SOLD, never activated, written off more than STALE_AFTER_DAYS ago. */
  stale:     number
}

export interface ResellerRow {
  tenantId:   string
  tenantName: string
  issued:     number
  sold:       number
  activated:  number
  stale:      number
  /** Sum of soldValue where the reseller recorded one. A floor, not a total. */
  resaleValue: number
  /** How many written-off codes carry no recorded value. */
  valueMissing: number
}

export interface ChannelRow {
  channel: 'MANUAL' | 'PLATFORM'
  count:   number
  value:   number
}

export interface PackageRevenueRow {
  packageName: string
  sales:       number
  units:       number
  revenue:     number
}

function staleCutoff(): Date {
  return new Date(Date.now() - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000)
}

export async function getGenCodeFunnel(): Promise<GenCodeFunnel> {
  await verifySession()

  const [issued, sold, activated, available, stale] = await Promise.all([
    prisma.genCode.count(),
    prisma.genCode.count({ where: { soldAt: { not: null } } }),
    prisma.genCode.count({ where: { status: 'ACTIVATED' } }),
    prisma.genCode.count({ where: { status: 'AVAILABLE' } }),
    prisma.genCode.count({ where: { status: 'SOLD', soldAt: { lt: staleCutoff() } } }),
  ])

  return { issued, sold, activated, available, stale }
}

export async function getResellerBreakdown(): Promise<ResellerRow[]> {
  await verifySession()

  const rows = await prisma.$queryRaw<{
    tenant_id:     string
    tenant_name:   string
    issued:        bigint
    sold:          bigint
    activated:     bigint
    stale:         bigint
    resale_value:  string | null
    value_missing: bigint
  }[]>`
    SELECT
      t.id                                                          AS tenant_id,
      t.trade_name                                                  AS tenant_name,
      COUNT(g.id)                                                   AS issued,
      COUNT(*) FILTER (WHERE g.sold_at IS NOT NULL)                 AS sold,
      COUNT(*) FILTER (WHERE g.status = 'ACTIVATED')                AS activated,
      COUNT(*) FILTER (WHERE g.status = 'SOLD'
                         AND g.sold_at < ${staleCutoff()})          AS stale,
      COALESCE(SUM(g.sold_value), 0)                                AS resale_value,
      COUNT(*) FILTER (WHERE g.sold_at IS NOT NULL
                         AND g.sold_value IS NULL)                  AS value_missing
    FROM gencodes g
    JOIN tenants  t ON g.tenant_id = t.id
    GROUP BY t.id, t.trade_name
    ORDER BY COUNT(g.id) DESC, t.trade_name ASC
  `

  return rows.map((r) => ({
    tenantId:     r.tenant_id,
    tenantName:   r.tenant_name,
    issued:       Number(r.issued),
    sold:         Number(r.sold),
    activated:    Number(r.activated),
    stale:        Number(r.stale),
    resaleValue:  Number(r.resale_value ?? 0),
    valueMissing: Number(r.value_missing),
  }))
}

/**
 * Folds raw `sold_via` groups into the two channels the product has.
 *
 * Exported for its own test: null `sold_via` predates the write-off lifecycle,
 * and a legacy row silently vanishing from the report is exactly the kind of
 * miscount a reader would never catch by eye.
 */
export function foldChannels(rows: { channel: string | null; count: number; value: number }[]): ChannelRow[] {
  const merged = new Map<'MANUAL' | 'PLATFORM', ChannelRow>([
    ['MANUAL',   { channel: 'MANUAL',   count: 0, value: 0 }],
    ['PLATFORM', { channel: 'PLATFORM', count: 0, value: 0 }],
  ])
  for (const r of rows) {
    const key = r.channel === 'PLATFORM' ? 'PLATFORM' : 'MANUAL'
    const acc = merged.get(key)!
    acc.count += r.count
    acc.value += r.value
  }
  return [...merged.values()]
}

export async function getChannelBreakdown(): Promise<ChannelRow[]> {
  await verifySession()

  const rows = await prisma.$queryRaw<{
    channel: string | null
    count:   bigint
    value:   string | null
  }[]>`
    SELECT
      sold_via                        AS channel,
      COUNT(*)                        AS count,
      COALESCE(SUM(sold_value), 0)    AS value
    FROM gencodes
    WHERE sold_at IS NOT NULL
    GROUP BY sold_via
  `

  return foldChannels(rows.map((r) => ({
    channel: r.channel,
    count:   Number(r.count),
    value:   Number(r.value ?? 0),
  })))
}

export async function getRevenueByPackage(): Promise<PackageRevenueRow[]> {
  await verifySession()

  const rows = await prisma.$queryRaw<{
    package_name: string
    sales:        bigint
    units:        bigint
    revenue:      string | null
  }[]>`
    SELECT
      p.name                                  AS package_name,
      COUNT(s.id)                             AS sales,
      COALESCE(SUM(s.quantity * p.quantity), 0) AS units,
      COALESCE(SUM(s.quantity * p.price), 0)  AS revenue
    FROM sales s
    JOIN packages p ON s.package_id = p.id
    WHERE s.reversed_at IS NULL
    GROUP BY p.name
    ORDER BY 4 DESC
  `

  return rows.map((r) => ({
    packageName: r.package_name,
    sales:       Number(r.sales),
    units:       Number(r.units),
    revenue:     Number(r.revenue ?? 0),
  }))
}
