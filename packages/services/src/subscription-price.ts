import 'server-only'

import { prisma } from '@genealogiq/db'

/**
 * Resolving a B2C plan's price, from the same versioned book the partner plans
 * use.
 *
 * Subscription used to carry its own price_usd / monthly_price_brl /
 * stripe_*_price_id columns, with exactly the defect plan_prices exists to fix:
 * editing an amount was an UPDATE, so it silently rewrote what every past sale
 * had been charged. Two ways of pricing in one system, only one of them honest.
 *
 * The naming reads B2B on its face, and the mapping is worth stating once:
 *
 *   annualCashAmount    the whole term, billed once   (was price_*)
 *   installmentAmount   one month of the same term    (was monthly_price_*)
 *   installmentCount    months in a term              (was termLength)
 *
 * For a partner that is twelve instalments of one annual contract; for a
 * consumer it is a monthly plan alongside the annual one. Same shape, and the
 * checkout treats them identically.
 */

export type PlanCadence = 'annual' | 'monthly'

export interface ResolvedPlanPrice {
  planPriceId:  string
  currency:     string
  annualAmount: number
  monthlyAmount: number | null
  termMonths:   number | null
  stripeAnnualPriceId:  string | null
  stripeMonthlyPriceId: string | null
}

/** Active, and not yet superseded — one definition of "in force", shared. */
const LIVE = { isActive: true, effectiveTo: null } as const

function toResolved(p: {
  id: string; currency: string
  annualCashAmount: unknown; installmentAmount: unknown; installmentCount: number | null
  stripeCashPriceId: string | null; stripeInstallmentPriceId: string | null
}): ResolvedPlanPrice {
  return {
    planPriceId:   p.id,
    currency:      p.currency,
    annualAmount:  Number(p.annualCashAmount),
    monthlyAmount: p.installmentAmount === null ? null : Number(p.installmentAmount),
    termMonths:    p.installmentCount,
    stripeAnnualPriceId:  p.stripeCashPriceId,
    stripeMonthlyPriceId: p.stripeInstallmentPriceId,
  }
}

const SELECT = {
  id: true, currency: true,
  annualCashAmount: true, installmentAmount: true, installmentCount: true,
  stripeCashPriceId: true, stripeInstallmentPriceId: true,
} as const

/**
 * The live price for one plan in one currency.
 *
 * Falls back to USD when the plan is not priced locally — the same rule the
 * per-currency book has always had: USD is the book for every country without
 * one of its own. Returns null when even that is missing, which is what makes a
 * plan correctly unsellable rather than sellable at a made-up amount.
 */
export async function resolveSubscriptionPrice(
  subscriptionId: string,
  currency:       string,
): Promise<ResolvedPlanPrice | null> {
  const rows = await prisma.planPrice.findMany({
    where:  { subscriptionId, ...LIVE, currency: { in: [currency.toUpperCase(), 'USD'] } },
    select: SELECT,
  })
  const exact = rows.find((r) => r.currency === currency.toUpperCase())
  const row   = exact ?? rows.find((r) => r.currency === 'USD')
  return row ? toResolved(row) : null
}

/** Live prices for many plans at once, keyed by subscription id. */
export async function mapSubscriptionPrices(
  subscriptionIds: string[],
  currency?:       string,
): Promise<Map<string, ResolvedPlanPrice>> {
  if (subscriptionIds.length === 0) return new Map()

  const wanted = currency ? [currency.toUpperCase(), 'USD'] : undefined
  const rows = await prisma.planPrice.findMany({
    where: {
      subscriptionId: { in: subscriptionIds },
      ...LIVE,
      ...(wanted ? { currency: { in: wanted } } : {}),
    },
    select: { ...SELECT, subscriptionId: true },
  })

  const byPlan = new Map<string, ResolvedPlanPrice>()
  for (const row of rows) {
    if (!row.subscriptionId) continue
    const existing = byPlan.get(row.subscriptionId)
    // Exact currency always wins over the USD fallback, whatever order the rows
    // arrived in.
    if (!existing || (currency && row.currency === currency.toUpperCase())) {
      byPlan.set(row.subscriptionId, toResolved(row))
    }
  }
  return byPlan
}

/**
 * Compares two plans by their monthly cost.
 *
 * Uses the explicit monthly amount when there is one — a real annual discount
 * does not derive proportionally from the annual price — and falls back to
 * annual/term otherwise. Positive when `a` is the richer tier.
 *
 * This is what decides whether a plan change is an upgrade (immediate, prorated)
 * or a downgrade (deferred to period end), so getting it backwards would charge
 * someone today for a plan they meant to leave.
 */
export function compareTier(a: ResolvedPlanPrice, b: ResolvedPlanPrice): number {
  const monthly = (p: ResolvedPlanPrice) =>
    p.monthlyAmount ?? p.annualAmount / Math.max(p.termMonths ?? 1, 1)
  return monthly(a) - monthly(b)
}

export function stripePriceIdFor(price: ResolvedPlanPrice, cadence: PlanCadence): string | null {
  return cadence === 'annual' ? price.stripeAnnualPriceId : price.stripeMonthlyPriceId
}
