import 'server-only'

import { prisma } from '@genealogiq/db'
import { stripe } from './stripe'

/**
 * Pushes a PartnerPlan and its live price book into Stripe.
 *
 * Shared rather than living in BMS because SEQ's self-serve checkout reads the
 * ids this writes, and a price that exists in one app's idea of Stripe and not
 * the other's is the failure mode this whole model was rebuilt to avoid.
 *
 * Two rules carry the scars of the old Package sync:
 *
 * 1. Every Price is RECURRING. The previous sync emitted no `recurring` block,
 *    which makes a Stripe Price one-time — and a one-time Price cannot be used
 *    in a `mode: 'subscription'` checkout at all. Stripe rejects the session,
 *    so the product looked synced in BMS and failed at the till.
 *
 * 2. A Price is never edited, only superseded. Stripe Prices are immutable by
 *    design; changing an amount means minting a new Price and archiving the
 *    old one. That happens to be exactly what the versioned price book already
 *    models, so the two line up: a new PlanPrice row gets a new Stripe Price,
 *    and the row it replaced keeps pointing at the archived one.
 */

/** Stripe wants the smallest currency unit, and every currency we sell in has two decimals. */
function toMinorUnits(amount: unknown): number {
  return Math.round(Number(amount) * 100)
}

export interface PlanSyncResult {
  planId:            string
  stripeProductId:   string
  pricesCreated:     number
  pricesReused:      number
}

/** Which side of the business owns the price rows being synced. */
export type PriceOwner = { partnerPlanId: string } | { subscriptionId: string }

const PRICE_SELECT = {
  id: true, currency: true, countryScope: true,
  annualCashAmount: true, installmentCount: true, installmentAmount: true,
  stripeProductId: true, stripeCashPriceId: true, stripeInstallmentPriceId: true,
} as const

/** Partner plans. Kept as its own export so callers read as what they mean. */
export async function syncPartnerPlan(planId: string): Promise<PlanSyncResult> {
  return syncPriceBook({ partnerPlanId: planId })
}

/** Consumer plans, through the same book and the same rules. */
export async function syncSubscriptionPrices(subscriptionId: string): Promise<PlanSyncResult> {
  return syncPriceBook({ subscriptionId })
}

export async function syncPriceBook(owner: PriceOwner): Promise<PlanSyncResult> {
  // Owner metadata and price rows are fetched separately rather than through a
  // nested include. The two owners are different tables, and unioning their
  // shapes buys nothing but a type every caller has to narrow again.
  const isPartner = 'partnerPlanId' in owner

  const meta = isPartner
    ? await prisma.partnerPlan.findUnique({
        where:  { id: owner.partnerPlanId },
        select: { id: true, name: true, code: true, description: true, annualAllowance: true },
      })
    : await prisma.subscription.findUnique({
        where:  { id: owner.subscriptionId },
        select: { id: true, name: true, code: true, description: true },
      })
  if (!meta) throw new Error('Price book owner not found')

  const plan = {
    id:              meta.id,
    name:            meta.name,
    code:            meta.code,
    description:     meta.description,
    annualAllowance: 'annualAllowance' in meta ? (meta.annualAllowance as number) : null,
    prices: await prisma.planPrice.findMany({
      where: {
        ...(isPartner ? { partnerPlanId: owner.partnerPlanId } : { subscriptionId: owner.subscriptionId }),
        isActive: true, effectiveTo: null,
      },
      select: PRICE_SELECT,
    }),
  }

  if (plan.prices.length === 0) throw new Error(`${plan.code} has no live prices to sync`)

  // One Stripe Product per plan, shared by every currency — the currency lives
  // on the Price, which is how Stripe models it. Reuse the id any price row
  // already carries so re-running this never forks the catalogue.
  const existingProductId = plan.prices.find((p) => p.stripeProductId)?.stripeProductId ?? null

  let productId: string
  if (existingProductId) {
    await stripe.products.update(existingProductId, {
      name:        plan.name,
      description: plan.description ?? undefined,
      metadata:    metadataFor(owner, plan),
    })
    productId = existingProductId
  } else {
    const product = await stripe.products.create({
      name:        plan.name,
      description: plan.description ?? undefined,
      metadata:    metadataFor(owner, plan),
    })
    productId = product.id
  }

  let created = 0
  let reused  = 0

  for (const price of plan.prices) {
    const currency = price.currency.toLowerCase()

    // The whole term billed once. Expressed in months rather than as a bare
    // year because the term is not always twelve — installmentCount carries it,
    // and a 6- or 18-month product needs no special case.
    let cashPriceId = price.stripeCashPriceId
    if (cashPriceId) {
      reused++
    } else {
      const months = price.installmentCount ?? 12
      const cash = await stripe.prices.create({
        product:     productId,
        currency,
        unit_amount: toMinorUnits(price.annualCashAmount),
        recurring:   { interval: 'month', interval_count: months },
        nickname:    `${plan.name} — à vista ${price.currency}`,
        metadata:    { planPriceId: price.id, cadence: 'cash' },
      })
      cashPriceId = cash.id
      created++
    }

    // Instalments: the SAME cycle, billed monthly. Deliberately open-ended —
    // no cancel_at. The old code scheduled one after termLength months, which
    // is what killed a monthly plan's stock at the end of its first term
    // instead of renewing it. The 12-month boundary is the SubscriptionCycle's
    // to own, not Stripe's.
    let installmentPriceId = price.stripeInstallmentPriceId
    const offersInstalments = price.installmentCount != null && price.installmentAmount != null
    if (installmentPriceId) {
      reused++
    } else if (offersInstalments) {
      const instalment = await stripe.prices.create({
        product:     productId,
        currency,
        unit_amount: toMinorUnits(price.installmentAmount),
        recurring:   { interval: 'month', interval_count: 1 },
        nickname:    `${plan.name} — ${price.installmentCount}x ${price.currency}`,
        metadata:    { planPriceId: price.id, cadence: 'installment', installmentCount: String(price.installmentCount) },
      })
      installmentPriceId = instalment.id
      created++
    }

    await prisma.planPrice.update({
      where: { id: price.id },
      data:  { stripeProductId: productId, stripeCashPriceId: cashPriceId, stripeInstallmentPriceId: installmentPriceId },
    })
  }

  return { planId: plan.id, stripeProductId: productId, pricesCreated: created, pricesReused: reused }
}

/**
 * What the Stripe Product carries back to us.
 *
 * Kept per owner rather than merged: a webhook or a dashboard search that finds
 * a Product needs to know which side of the business it belongs to, and a
 * single blurred shape would make that a guess.
 */
function metadataFor(
  owner: PriceOwner,
  plan:  { id: string; code: string; annualAllowance: number | null },
): Record<string, string> {
  if ('partnerPlanId' in owner) {
    return {
      partnerPlanId:   plan.id,
      code:            plan.code,
      annualAllowance: String(plan.annualAllowance ?? ''),
    }
  }
  return { subscriptionId: plan.id, code: plan.code }
}
