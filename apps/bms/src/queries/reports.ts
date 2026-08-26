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
 * - **Revenue is counted per CYCLE.** A cycle only exists once an invoice was
 *   paid, so opening one IS the settlement — there is no unpaid state to filter.
 * - **Revenue is grouped by currency, never summed across them.** The catalogue
 *   is priced in three, and adding 100 BRL to 100 USD produces 200 of nothing.
 *   Every money query returns one row per currency and the page prints them
 *   side by side rather than inventing a conversion rate to maintain.
 * - **Revenue is the amount Stripe reported**, snapshotted on the sale in cents.
 *   Nothing is recomputed from the plan's current price. That was the old
 *   model's scar: editing a package price rewrote the revenue history of every
 *   sale that carried no snapshot.
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
  /**
   * Median days from write-off to activation.
   *
   * Nobody has ever measured this, and two commercial numbers were guessed
   * against it: how long a committed reservation should outlive its cycle
   * (currently 12 months) and how long the B2C trial should run. Both were
   * picked without data. This is the data.
   */
  medianLagDays: number | null
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

export interface PlanRevenueRow {
  planName: string
  /** Uppercase ISO code. One row per plan PER CURRENCY. */
  currency: string
  /** Cycles opened — first cycles and renewals alike. */
  cycles:   number
  /** Activations the plan's cycles granted. */
  allowance: number
  revenue:  number
}

/**
 * Sell-through: how much of what a partner was granted they actually used.
 *
 * The number the founder's spec calls the decision metric, and it could not be
 * asked of the old model at all — that one measured stock issued, which says
 * nothing about whether a family ever received anything.
 */
export interface SellThroughRow {
  tenantId:   string
  tenantName: string
  granted:    number
  consumed:   number
  /** 0..1. Null when nothing was granted, rather than a fake zero. */
  rate:       number | null
  /** Median days between a partner selling a code and the family activating it. */
  medianLagDays: number | null
}

function staleCutoff(): Date {
  return new Date(Date.now() - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000)
}

export async function getGenCodeFunnel(): Promise<GenCodeFunnel> {
  await verifySession()

  const [issued, sold, activated, available, stale, lag] = await Promise.all([
    prisma.genCode.count(),
    prisma.genCode.count({ where: { soldAt: { not: null } } }),
    prisma.genCode.count({ where: { status: 'ACTIVATED' } }),
    prisma.genCode.count({ where: { status: 'AVAILABLE' } }),
    prisma.genCode.count({ where: { status: 'SOLD', soldAt: { lt: staleCutoff() } } }),
    prisma.$queryRaw<{ median: number | null }[]>`
      SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (
               ORDER BY EXTRACT(EPOCH FROM (activated_at - sold_at)) / 86400
             ) AS median
      FROM gencodes
      WHERE sold_at IS NOT NULL AND activated_at IS NOT NULL
    `,
  ])

  const medianLagDays = lag[0]?.median == null ? null : Math.round(Number(lag[0].median) * 10) / 10
  return { issued, sold, activated, available, stale, medianLagDays }
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
      t.name                                                        AS tenant_name,
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
    GROUP BY t.id, t.name
    ORDER BY COUNT(g.id) DESC, t.name ASC
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

export async function getRevenueByPlan(): Promise<PlanRevenueRow[]> {
  await verifySession()

  const rows = await prisma.$queryRaw<{
    plan_name: string
    currency:  string | null
    cycles:    bigint
    allowance: bigint
    revenue:   string | null
  }[]>`
    SELECT
      pp.name                                                     AS plan_name,
      COALESCE(c.price_snapshot->>'currency', 'USD')              AS currency,
      COUNT(c.id)                                                 AS cycles,
      COALESCE(SUM((c.plan_snapshot->>'annualAllowance')::int), 0) AS allowance,
      COALESCE(SUM((c.price_snapshot->>'amountPaid')::numeric / 100), 0) AS revenue
    FROM subscription_cycles c
    JOIN partner_plans pp ON pp.id = c.plan_id
    GROUP BY pp.name, COALESCE(c.price_snapshot->>'currency', 'USD')
    ORDER BY 1, 5 DESC
  `

  return rows.map((r) => ({
    planName:  r.plan_name,
    currency:  (r.currency ?? 'USD').toUpperCase(),
    cycles:    Number(r.cycles),
    allowance: Number(r.allowance),
    revenue:   Number(r.revenue ?? 0),
  }))
}

/**
 * Sell-through per partner, straight off the ledger.
 *
 * `granted` and `consumed` come from the transactions rather than from the
 * grants' counters, because the counters are a materialisation and this is the
 * report someone will use to argue about money.
 */
export async function getSellThrough(): Promise<SellThroughRow[]> {
  await verifySession()

  const rows = await prisma.$queryRaw<{
    tenant_id:   string
    tenant_name: string
    granted:     bigint
    consumed:    bigint
    median_lag:  number | null
  }[]>`
    SELECT
      t.id                                                                 AS tenant_id,
      t.name                                                               AS tenant_name,
      COALESCE(SUM(x.quantity) FILTER (WHERE x.type = 'GRANT'), 0)         AS granted,
      COALESCE(SUM(x.quantity) FILTER (WHERE x.type = 'CONSUME'), 0)       AS consumed,
      (SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (
                ORDER BY EXTRACT(EPOCH FROM (g.activated_at - g.sold_at)) / 86400)
         FROM gencodes g
        WHERE g.tenant_id = t.id AND g.sold_at IS NOT NULL AND g.activated_at IS NOT NULL
      )                                                                    AS median_lag
    FROM tenants t
    LEFT JOIN credit_transactions x ON x.tenant_id = t.id
    GROUP BY t.id, t.name
    HAVING COALESCE(SUM(x.quantity) FILTER (WHERE x.type = 'GRANT'), 0) > 0
    ORDER BY 3 DESC
  `

  return rows.map((r) => {
    const granted  = Number(r.granted)
    const consumed = Number(r.consumed)
    return {
      tenantId:      r.tenant_id,
      tenantName:    r.tenant_name,
      granted,
      consumed,
      // Null rather than 0 when nothing was granted: a partner who was never
      // given anything has no sell-through, which is not the same as bad.
      rate:          granted > 0 ? Math.round((consumed / granted) * 1000) / 1000 : null,
      medianLagDays: r.median_lag == null ? null : Math.round(Number(r.median_lag) * 10) / 10,
    }
  })
}

/**
 * Post-trial conversion — the KPI the founder's spec does not have.
 *
 * In a B2B2C business it is arguably the number that decides everything: the
 * B2B line pays for the activation, and this says whether that activation ever
 * turned into recurring consumer revenue.
 */
export async function getTrialConversion(): Promise<{
  granted: number
  converted: number
  stillTrialing: number
  lapsed: number
  rate: number | null
}> {
  await verifySession()

  const [granted, converted, stillTrialing] = await Promise.all([
    // Trials are the card-less rows: granted by an activation, never by Stripe.
    prisma.appSale.count({ where: { stripeSubscriptionId: null, status: 'trialing' } }),
    prisma.appSale.count({ where: { stripeSubscriptionId: { not: null } } }),
    prisma.appSale.count({
      where: { stripeSubscriptionId: null, status: 'trialing', currentPeriodEnd: { gt: new Date() } },
    }),
  ])

  const lapsed = granted - stillTrialing
  const decided = converted + lapsed
  return {
    granted,
    converted,
    stillTrialing,
    lapsed,
    // Measured against trials that have actually RESOLVED. Counting the ones
    // still running would report a conversion rate that only ever falls.
    rate: decided > 0 ? Math.round((converted / decided) * 1000) / 1000 : null,
  }
}
