import 'server-only'

import type Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { generateGenCode } from '@/lib/gen-code'

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
