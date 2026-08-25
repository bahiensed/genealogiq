import 'server-only'

import type Stripe from 'stripe'
import { prisma } from '@genealogiq/db'
import { generateGenCode, isStripeStatusLive } from '@genealogiq/core'
import { stripe } from './stripe'

/**
 * Which app opened a checkout. Stripe fans every subscribed event out to EVERY
 * endpoint on the account, so both webhooks see both apps' subscriptions —
 * exactly one must act, and this is what decides which.
 */
export const CHECKOUT_ORIGINS = { bms: 'bms', seq: 'seq' } as const
export type CheckoutOrigin = (typeof CHECKOUT_ORIGINS)[keyof typeof CHECKOUT_ORIGINS]

export interface SubscriptionApplied {
  tenantId:     string
  /** True only on the transition to paid — the moment the codes were minted. */
  firstPayment: boolean
}

/**
 * Applies a Stripe Subscription to the sale it belongs to.
 *
 * Shared because the two apps sell the same thing: BMS sends a payment link, a
 * tenant buys directly in SEQ, and both end in a subscription that has to mint
 * exactly one batch and keep one window. Duplicating this would mean two
 * chances to get the "mint once" rule wrong.
 *
 * Returns null when the event is not this origin's, or the sale is gone.
 * Post-payment side effects differ per app and stay with the caller.
 */
export async function applyGenCodeSubscription(
  sub:    Stripe.Subscription,
  origin: CheckoutOrigin,
): Promise<SubscriptionApplied | null> {
  const meta = sub.metadata ?? {}
  if (meta.origin !== origin) return null

  const saleId = Number(meta.saleId)
  if (!Number.isInteger(saleId)) {
    console.error('[gencode-fulfilment] subscription carries no usable saleId', { sub: sub.id, meta })
    return null
  }

  const item = sub.items.data[0]
  // In Stripe SDK v18+, current_period_end moved from the Subscription onto
  // each item.
  const periodEnd = item?.current_period_end ? new Date(item.current_period_end * 1000) : null

  const sale = await prisma.sale.findUnique({
    where:  { id: saleId },
    select: { id: true, paidAt: true, quantity: true, packageId: true, tenantId: true,
              package: { select: { quantity: true } } },
  })
  if (!sale) {
    console.error('[gencode-fulfilment] subscription points at a sale that is gone', { sub: sub.id, saleId })
    return null
  }

  // `customer.subscription.created` can arrive as `incomplete` — the
  // subscription exists but the first invoice has not been paid. Minting there
  // would hand over a whole batch for nothing. The follow-up `updated` carries
  // the paying status.
  const firstPayment = isStripeStatusLive(sub.status) && !sale.paidAt

  await prisma.$transaction(async (tx) => {
    await tx.sale.update({
      where: { id: sale.id },
      data: {
        status:               sub.status,
        // The PERIOD end, not the term end. A monthly plan's window is pushed
        // forward by each payment, so falling behind closes it with nothing
        // having to notice, and catching up reopens it.
        accessEndsAt:         periodEnd,
        stripeSubscriptionId: sub.id,
        currency:             item?.price.currency ?? undefined,
        amountTotal:          item?.price.unit_amount != null
          ? item.price.unit_amount * sale.quantity
          : undefined,
        ...(firstPayment && { paidAt: new Date(), expiredAt: null, failedAt: null }),
      },
    })

    if (!firstPayment) return

    // `id` omitted so Prisma fills it via @default(cuid()). An
    // `id: crypto.randomUUID()` here once relied on a global undefined in the
    // deployed Node runtime, and every purchase was charged in Stripe and never
    // written to the database.
    const codes = Array.from({ length: sale.package.quantity * sale.quantity }, () => ({
      genCode:   generateGenCode(),
      saleId:    sale.id,
      packageId: sale.packageId,
      tenantId:  sale.tenantId,
    }))
    await tx.genCode.createMany({ data: codes })
  })

  if (firstPayment) await scheduleMonthlyPlanEnd(sub, meta)

  return { tenantId: sale.tenantId, firstPayment }
}

/**
 * A monthly plan is a fixed number of instalments, not an open-ended
 * subscription.
 *
 * Stripe has no "charge N times and stop", so the end is a cancel_at on the
 * subscription. Applied here rather than at checkout because Checkout's
 * subscription_data does not accept it, and guarded on cancel_at already being
 * set, since every later event re-enters this path.
 *
 * Best-effort: the codes are minted and the money is arriving, so a failure
 * means the plan runs long — a billing conversation, not a reason to make
 * Stripe retry a fulfilment that succeeded.
 */
async function scheduleMonthlyPlanEnd(
  sub:  Stripe.Subscription,
  meta: Record<string, string>,
): Promise<void> {
  if (meta.cadence !== 'monthly') return
  if (sub.cancel_at) return

  const months = Number(meta.termLength)
  if (!Number.isInteger(months) || months <= 0) return

  const end = new Date(sub.start_date * 1000)
  end.setMonth(end.getMonth() + months)

  await stripe.subscriptions
    .update(sub.id, { cancel_at: Math.floor(end.getTime() / 1000) })
    .catch((err: unknown) =>
      console.error('[gencode-fulfilment] could not schedule plan end', { sub: sub.id, err }))
}
