import 'server-only'

import type Stripe from 'stripe'
import { randomBytes } from 'crypto'
import { hashToken } from '@genealogiq/core'
import { prisma } from '@/lib/prisma'
import { generateGenCode } from '@/lib/gen-code'
import { sendSequoiaWelcomeEmail } from '@/lib/email'
import { stripe } from '@/lib/stripe'
import { isStripeStatusLive } from '@genealogiq/core'

/** Matches the window createCustomer used to mint before access was payment-gated. */
const RESET_TOKEN_TTL_MS = 72 * 60 * 60 * 1000

/** Checkout Sessions BMS opens carry this, so both webhooks know whose they are. */
export const BMS_ORIGIN = 'bms'

function paymentIntentIdOf(session: Stripe.Checkout.Session): string | null {
  return typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id ?? null
}

/**
 * Settles a BMS payment-link sale: marks it paid, snapshots what Stripe charged,
 * and mints the GenCodes that until now did not exist.
 *
 * This is the inverse of SEQ's applyCheckoutSession. There the webhook CREATES
 * the sale, so the stripeSessionId unique is what makes a replay idempotent.
 * Here the row already exists — created when the operator generated the link —
 * so idempotency is `paidAt` being set. Reusing the unique would be wrong: the
 * row is there before any payment, so a constraint violation would say "already
 * settled" about a sale nobody has paid for.
 */
export async function applySalePayment(session: Stripe.Checkout.Session): Promise<void> {
  const sale = await prisma.sale.findUnique({
    where:  { stripeSessionId: session.id },
    select: { id: true, paidAt: true, quantity: true, packageId: true, tenantId: true,
              package: { select: { quantity: true } } },
  })
  if (!sale) throw new Error(`No sale for checkout session ${session.id}`)
  if (sale.paidAt) return

  const totalUnits = sale.package.quantity * sale.quantity

  await prisma.$transaction(async (tx) => {
    await tx.sale.update({
      where: { id: sale.id },
      data: {
        paidAt:                new Date(),
        // A link that was paid is no longer expired or failed, whatever an
        // earlier event said. An async payment can fail and then succeed on a
        // second attempt against the same session.
        expiredAt:             null,
        failedAt:              null,
        amountSubtotal:        session.amount_subtotal,
        amountTotal:           session.amount_total,
        currency:              session.currency,
        stripePaymentIntentId: paymentIntentIdOf(session),
      },
    })

    // `id` is deliberately omitted so Prisma fills it via @default(cuid()).
    // apps/seq/src/lib/billing.ts carries the scar: an `id: crypto.randomUUID()`
    // here relied on a global that is undefined in the deployed Node runtime, so
    // it threw and rolled back the whole transaction — every purchase charged in
    // Stripe and never written to the database. Unit tests masked it, because
    // vitest exposes a global `crypto`.
    const codes = Array.from({ length: totalUnits }, () => ({
      genCode:   generateGenCode(),
      saleId:    sale.id,
      packageId: sale.packageId,
      tenantId:  sale.tenantId,
    }))
    await tx.genCode.createMany({ data: codes })
  })

  // After the transaction, never inside it: this sends an email, and an email
  // cannot be rolled back. If it throws, the webhook returns 500 and Stripe
  // retries — applySalePayment is idempotent on paidAt, so the retry skips
  // straight here and tries the welcome again.
  await provisionTenantAccess(sale.tenantId)
}

/**
 * Settles a sale nobody paid through Stripe: a transfer, a PIX, a deposit.
 *
 * Deliberately the same fulfilment as the webhook — mint the codes, open Sequoia
 * — so the two ways money can arrive cannot drift into two different outcomes.
 * The one difference is paidById, which records who vouched for the payment.
 * Stripe-settled sales leave it null, and that is how the two are told apart.
 */
export async function settleSaleManually(saleId: number, paidById: string): Promise<void> {
  const sale = await prisma.sale.findUnique({
    where:  { id: saleId },
    select: { id: true, paidAt: true, quantity: true, packageId: true, tenantId: true,
              package: { select: { quantity: true } } },
  })
  if (!sale) throw new Error(`Sale ${saleId} not found`)
  if (sale.paidAt) return

  const totalUnits = sale.package.quantity * sale.quantity

  await prisma.$transaction(async (tx) => {
    await tx.sale.update({
      where: { id: sale.id },
      data:  { paidAt: new Date(), paidById, expiredAt: null, failedAt: null },
    })
    const codes = Array.from({ length: totalUnits }, () => ({
      genCode:   generateGenCode(),
      saleId:    sale.id,
      packageId: sale.packageId,
      tenantId:  sale.tenantId,
    }))
    await tx.genCode.createMany({ data: codes })
  })

  await provisionTenantAccess(sale.tenantId)
}

/**
 * Applies a Stripe Subscription to the sale it belongs to.
 *
 * Replaces the one-time path for GenCode products: both cadences are
 * subscriptions now, so state comes from customer.subscription.* and the
 * checkout session is ignored — the same split the APP already documents.
 *
 * Three jobs, in one place because they must agree:
 *
 * 1. Mirror the subscription onto the sale — status raw and uninterpreted,
 *    accessEndsAt from the current period. Keeping accessEndsAt at the PERIOD
 *    end rather than the term end is what makes the freeze work: a monthly
 *    plan's window is pushed forward by each payment, so falling behind closes
 *    it without anything having to notice.
 * 2. Mint the GenCodes, exactly once, and only once money has actually arrived.
 * 3. Stop a monthly plan after its term.
 */
export async function applySubscriptionToSale(sub: Stripe.Subscription): Promise<void> {
  const meta = sub.metadata ?? {}
  if (meta.origin !== BMS_ORIGIN) return

  const saleId = Number(meta.saleId)
  if (!Number.isInteger(saleId)) {
    console.error('[bms-billing] subscription carries no usable saleId', { sub: sub.id, meta })
    return
  }

  const item = sub.items.data[0]
  // In Stripe SDK v18+, current_period_end moved from the Subscription onto
  // each item.
  const periodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000)
    : null

  const sale = await prisma.sale.findUnique({
    where:  { id: saleId },
    select: { id: true, paidAt: true, quantity: true, packageId: true, tenantId: true,
              package: { select: { quantity: true } } },
  })
  if (!sale) {
    console.error('[bms-billing] subscription points at a sale that is gone', { sub: sub.id, saleId })
    return
  }

  // `customer.subscription.created` can arrive as `incomplete` — the
  // subscription exists but the first invoice has not been paid. Minting there
  // would hand over a whole batch for nothing. Wait for a status that means
  // money actually arrived; the follow-up `updated` carries it.
  const live      = isStripeStatusLive(sub.status)
  const firstPaid = live && !sale.paidAt

  await prisma.$transaction(async (tx) => {
    await tx.sale.update({
      where: { id: sale.id },
      data: {
        status:               sub.status,
        accessEndsAt:         periodEnd,
        stripeSubscriptionId: sub.id,
        currency:             item?.price.currency ?? undefined,
        amountTotal:          item?.price.unit_amount != null
          ? item.price.unit_amount * sale.quantity
          : undefined,
        ...(firstPaid && { paidAt: new Date(), expiredAt: null, failedAt: null }),
      },
    })

    if (!firstPaid) return

    // `id` omitted so Prisma fills it via @default(cuid()) — see the scar
    // documented in apps/seq/src/lib/billing.ts.
    const codes = Array.from({ length: sale.package.quantity * sale.quantity }, () => ({
      genCode:   generateGenCode(),
      saleId:    sale.id,
      packageId: sale.packageId,
      tenantId:  sale.tenantId,
    }))
    await tx.genCode.createMany({ data: codes })
  })

  if (firstPaid) {
    // Outside the transaction: this sends an email, and an email cannot be
    // rolled back.
    await provisionTenantAccess(sale.tenantId)
    await scheduleMonthlyPlanEnd(sub, meta)
  }
}

/**
 * A monthly plan is twelve instalments, not an open-ended subscription.
 *
 * Stripe has no notion of "charge N times and stop", so the end is set as a
 * cancel_at on the subscription itself. Applied here rather than at checkout
 * because Checkout's subscription_data does not accept it — and applied once,
 * guarded on cancel_at already being set, since every later event re-enters
 * this path.
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

  // Best-effort: the codes are already minted and the money is arriving. A
  // failure here means the plan runs long, which is a billing conversation, not
  // a reason to make Stripe retry a fulfilment that succeeded.
  await stripe.subscriptions
    .update(sub.id, { cancel_at: Math.floor(end.getTime() / 1000) })
    .catch((err: unknown) => console.error('[bms-billing] could not schedule plan end', { sub: sub.id, err }))
}

/**
 * A Checkout Session that will never be paid: it expired unopened, or an async
 * payment (boleto, Pix, ACH) bounced after checkout completed.
 *
 * Both dead-end the link and both leave the operator with the same next step,
 * but they are recorded apart — one is the customer running out of time, the
 * other is the money not arriving, and telling them apart is the difference
 * between chasing a customer and chasing a bank.
 *
 * Never touches a sale already paid: Stripe can deliver an expiry for a session
 * that settled moments earlier.
 */
export async function markSaleUnpayable(
  sessionId: string,
  reason:    'expired' | 'failed',
): Promise<void> {
  const sale = await prisma.sale.findUnique({
    where:  { stripeSessionId: sessionId },
    select: { id: true, paidAt: true },
  })
  if (!sale || sale.paidAt) return

  await prisma.sale.update({
    where: { id: sale.id },
    data:  reason === 'expired' ? { expiredAt: new Date() } : { failedAt: new Date() },
  })
}

/**
 * Opens Sequoia to a tenant that has now paid for something.
 *
 * createCustomer writes the owner inactive, with no token and no email: a
 * customer who never buys must not get a login. This is the other half — it runs
 * on the first settled sale and does what registration used to do eagerly.
 *
 * Idempotent, and that matters more than it looks. It runs on EVERY payment, not
 * just the first, and a tenant who buys again must not have their password reset
 * out from under them. An already-active owner is left alone.
 */
export async function provisionTenantAccess(tenantId: string): Promise<void> {
  const owner = await prisma.user.findFirst({
    where:  { tenantId, role: 'OWNER' },
    select: { id: true, email: true, isActive: true },
  })
  // A tenant with no owner row is a data problem, not a payment problem — the
  // money is already in and the GenCodes are already minted, so failing here
  // would only make the webhook retry a fulfilment that succeeded.
  if (!owner) {
    console.error('[bms-billing] paid tenant has no OWNER user', { tenantId })
    return
  }
  if (owner.isActive) return

  const token = randomBytes(32).toString('hex')

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: owner.id }, data: { isActive: true } })
    await tx.passwordResetToken.deleteMany({ where: { userId: owner.id } })
    await tx.passwordResetToken.create({
      data: {
        token:     hashToken(token),
        userId:    owner.id,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    })
  })

  await sendSequoiaWelcomeEmail(owner.email, token)
}
