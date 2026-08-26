import 'server-only'

import { prisma } from '@genealogiq/db'
import type { AppCurrency } from '@genealogiq/core'
import { stripe } from './stripe'
import { ensureTenantStripeCustomer } from './stripe-customer'

/**
 * Opens a Stripe Checkout Session for a partner plan, from either app.
 *
 * Shared for the same reason the fulfilment is: BMS emails a payment link and a
 * tenant buys directly in SEQ, but both end in one subscription that has to
 * produce exactly one contract and one cycle. Two implementations would mean
 * two chances to get that wrong.
 *
 * The contract row is written BEFORE the session exists, deliberately — the
 * same discipline the old Sale flow used. It is the row the webhook finds, and
 * it is what makes a purchase visible as awaiting payment instead of appearing
 * from nowhere once Stripe settles. If the session cannot be created, the row
 * is deleted rather than left as a contract nobody can pay.
 */

/**
 * Stripe caps a Checkout Session at 24 hours from creation, and rejects
 * anything longer outright: "The `expires_at` timestamp must be less than 24
 * hours from Checkout Session creation."
 *
 * Worth knowing because the old Sale flow asked for SEVEN days, under a comment
 * claiming a 30-day ceiling. That ceiling is stale, which means the legacy
 * payment link never worked either — consistent with there being no completed
 * B2B sale in the account's whole history.
 *
 * 23 hours rather than 24 so a slow request cannot round past the limit.
 */
export const CHECKOUT_TTL_HOURS = 23

/**
 * Which app opened a checkout. Stripe fans every subscribed event out to EVERY
 * endpoint on the account, so both apps' webhooks see both apps' subscriptions —
 * exactly one must act, and this is what decides which.
 */
export const CHECKOUT_ORIGINS = { bms: 'bms', seq: 'seq' } as const
export type CheckoutOrigin = (typeof CHECKOUT_ORIGINS)[keyof typeof CHECKOUT_ORIGINS]

export type PartnerCadence = 'cash' | 'installment'

export interface PartnerCheckoutInput {
  tenantId:         string
  planId:           string
  cadence:          PartnerCadence
  currency:         AppCurrency
  origin:           CheckoutOrigin
  successUrl:       string
  cancelUrl:        string
  /** An operator-chosen coupon. Omit to let the buyer type their own on Stripe's page. */
  promotionCodeId?: string | null
}

export interface PartnerCheckoutResult {
  url:                   string
  partnerSubscriptionId: string
  planName:              string
  amountTotal:           number | null
  currency:              string | null
  expiresAt:             Date
}

export class PartnerCheckoutError extends Error {
  constructor(readonly reason: 'plan-not-found' | 'not-priced' | 'not-synced' | 'no-url', message: string) {
    super(message)
    this.name = 'PartnerCheckoutError'
  }
}

export async function openPartnerCheckout(input: PartnerCheckoutInput): Promise<PartnerCheckoutResult> {
  const { tenantId, planId, cadence, currency, origin, successUrl, cancelUrl, promotionCodeId } = input

  const plan = await prisma.partnerPlan.findFirst({
    where:  { id: planId, isActive: true },
    select: {
      id: true, name: true, code: true, annualAllowance: true,
      prices: {
        // The live row of the price book: active and not yet superseded. A plan
        // priced only in dollars is simply invisible from the Portuguese
        // interface, which is the point of a per-currency book.
        where:  { currency: currency.toUpperCase(), isActive: true, effectiveTo: null },
        orderBy: { effectiveFrom: 'desc' },
        take:    1,
        select:  { id: true, stripeCashPriceId: true, stripeInstallmentPriceId: true },
      },
    },
  })
  if (!plan) throw new PartnerCheckoutError('plan-not-found', `PartnerPlan ${planId} not found or inactive`)

  const price = plan.prices[0]
  if (!price) throw new PartnerCheckoutError('not-priced', `${plan.code} has no live ${currency} price`)

  const stripePriceId = cadence === 'cash' ? price.stripeCashPriceId : price.stripeInstallmentPriceId
  if (!stripePriceId) {
    throw new PartnerCheckoutError('not-synced', `${plan.code} ${currency} ${cadence} is not synced with Stripe`)
  }

  const customer  = await ensureTenantStripeCustomer(tenantId)
  const expiresAt = new Date(Date.now() + CHECKOUT_TTL_HOURS * 60 * 60 * 1000)

  // PENDING and with no Stripe subscription id yet: the subscription does not
  // exist until the buyer completes checkout. linkPartnerSubscription fills it
  // in from the metadata below, off customer.subscription.created.
  const contract = await prisma.partnerSubscription.create({
    data:   { tenantId, planId: plan.id, status: 'PENDING' },
    select: { id: true },
  })

  try {
    const metadata = {
      origin,
      partnerSubscriptionId: contract.id,
      tenantId,
      planId:      plan.id,
      planCode:    plan.code,
      planPriceId: price.id,
      cadence,
    }

    const checkout = await stripe.checkout.sessions.create({
      mode:                'subscription',
      customer,
      line_items:          [{ price: stripePriceId, quantity: 1 }],
      client_reference_id: tenantId,
      metadata,
      // Stamped on the SUBSCRIPTION, not just the session. The webhook reads it
      // from there and nowhere else — omit this and every customer.subscription.*
      // event silently no-ops, which is the failure this flow is most likely to
      // hit and least likely to notice.
      subscription_data:   { metadata },
      expires_at:          Math.floor(expiresAt.getTime() / 1000),
      success_url:         successUrl,
      cancel_url:          cancelUrl,
      // Mutually exclusive in the Stripe API — sending both is a 400.
      ...(promotionCodeId
        ? { discounts: [{ promotion_code: promotionCodeId }] }
        : { allow_promotion_codes: true }),
    })

    if (!checkout.url) throw new PartnerCheckoutError('no-url', 'Stripe returned a session with no URL')

    await prisma.partnerSubscription.update({
      where: { id: contract.id },
      data:  { stripeCustomerId: customer },
    })

    return {
      url:                   checkout.url,
      partnerSubscriptionId: contract.id,
      planName:              plan.name,
      amountTotal:           checkout.amount_total,
      currency:              checkout.currency,
      expiresAt,
    }
  } catch (err) {
    // A contract with no session is one nobody can pay and nobody can see the
    // state of. Same reasoning the old Sale flow settled on: delete rather than
    // leave it awaiting payment forever.
    await prisma.partnerSubscription.delete({ where: { id: contract.id } }).catch(() => {})
    throw err
  }
}
