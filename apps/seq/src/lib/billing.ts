import type Stripe from "stripe"
import { prisma } from "@/lib/prisma"
import { generateGenCode } from "@/lib/gen-code"

// Moved to @genealogiq/services so BMS resolves the same Customer per Tenant.
// Re-exported here so existing `@/lib/billing` imports keep working unchanged.
export { ensureTenantStripeCustomer } from "@genealogiq/services/stripe-customer"

export interface CheckoutContext {
  tenantId:  string
  packageId: string
  quantity:  number
  soldById:  string
}

/**
 * Applies a completed Checkout Session to the DB: creates the Sale row and
 * mints one license per unit ordered, atomically. Idempotent via
 * `Sale.stripeSessionId` unique — a duplicate apply throws P2002 inside the
 * transaction, which is swallowed and rolls the licenses back, leaving the
 * state untouched.
 */
export async function applyCheckoutSession(
  session: Stripe.Checkout.Session,
  ctx:     CheckoutContext,
): Promise<void> {
  const pkg = await prisma.package.findUnique({
    where:  { id: ctx.packageId },
    select: { quantity: true },
  })
  if (!pkg) throw new Error(`Package ${ctx.packageId} not found`)

  const totalUnits = pkg.quantity * ctx.quantity
  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? null

  try {
    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          packageId:             ctx.packageId,
          tenantId:              ctx.tenantId,
          soldById:              ctx.soldById,
          quantity:              ctx.quantity,
          // This path only ever runs on a settled payment, so the sale is born
          // paid. Saying so explicitly matters now that Sale has an unpaid
          // state: without it every self-serve purchase would show up in BMS as
          // "awaiting payment" forever.
          paidAt:                new Date(),
          amountSubtotal:        session.amount_subtotal,
          amountTotal:           session.amount_total,
          currency:              session.currency,
          stripeSessionId:       session.id,
          stripePaymentIntentId: paymentIntentId,
        },
      })

      // Generate N unique license codes — one per QR unit ordered.
      // The @unique constraint on gen_code defends against the astronomically
      // unlikely collision (80-bit entropy); P2002 aborts the tx and Stripe retries.
      //
      // `id` is intentionally omitted: Prisma fills it via @default(cuid()). The
      // previous `id: crypto.randomUUID()` relied on an unimported `crypto` global
      // that is undefined in the deployed Node runtime, so it threw here and rolled
      // back the whole transaction — every physical purchase was charged in Stripe
      // but never written to the DB. (Unit tests masked it: Node/vitest expose a
      // global `crypto`, so the throw only happened in production.)
      const licenses = Array.from({ length: totalUnits }, () => ({
        genCode:   generateGenCode(),
        saleId:    sale.id,
        packageId: ctx.packageId,
        tenantId:  ctx.tenantId,
      }))
      await tx.genCode.createMany({ data: licenses })
    })
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      // Duplicate apply for the same checkout session — already processed.
      return
    }
    throw err
  }
}
