import type Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"

/**
 * One Stripe Customer per Tenant — billing/invoices are consolidated across
 * employees buying QR packages for the same funeral home.
 */
export async function ensureTenantStripeCustomer(tenantId: string): Promise<string> {
  const tenant = await prisma.tenant.findUnique({
    where:  { id: tenantId },
    select: { stripeCustomerId: true, email: true, tradeName: true, name: true },
  })
  if (!tenant) throw new Error("Tenant not found")
  if (tenant.stripeCustomerId) return tenant.stripeCustomerId

  const customer = await stripe.customers.create({
    email:    tenant.email,
    name:     tenant.tradeName || tenant.name,
    metadata: { tenantId },
  })

  await prisma.tenant.update({
    where: { id: tenantId },
    data:  { stripeCustomerId: customer.id },
  })

  return customer.id
}

export interface CheckoutContext {
  tenantId:  string
  packageId: string
  quantity:  number
  soldById:  string
}

/**
 * Applies a completed Checkout Session to the DB: creates the Sale row and
 * bumps QrInventory atomically. Idempotent via `Sale.stripeSessionId` unique —
 * a duplicate apply throws P2002 inside the transaction, which is swallowed
 * and rolls back the inventory update, leaving the state untouched.
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

  const totalQRCodes = pkg.quantity * ctx.quantity
  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? null

  try {
    await prisma.$transaction(async (tx) => {
      await tx.sale.create({
        data: {
          packageId:             ctx.packageId,
          tenantId:              ctx.tenantId,
          soldById:              ctx.soldById,
          quantity:              ctx.quantity,
          stripeSessionId:       session.id,
          stripePaymentIntentId: paymentIntentId,
        },
      })

      await tx.qrInventory.upsert({
        where:  { tenantId: ctx.tenantId },
        create: { tenantId: ctx.tenantId, quantity: totalQRCodes },
        update: { quantity: { increment: totalQRCodes } },
      })
    })
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      // Duplicate apply for the same checkout session — already processed.
      return
    }
    throw err
  }
}
