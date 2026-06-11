import type Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { generateGenCode } from "@/lib/gen-code"

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
    select: { quantity: true, type: true },
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
          stripeSessionId:       session.id,
          stripePaymentIntentId: paymentIntentId,
        },
      })

      if (pkg.type === "PHYSICAL") {
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
        await tx.physicalQrLicense.createMany({ data: licenses })
        // QrInventory is NOT touched for PHYSICAL packages
      } else {
        // DIGITAL: existing behaviour — increment the tenant's QR inventory.
        await tx.qrInventory.upsert({
          where:  { tenantId: ctx.tenantId },
          create: { tenantId: ctx.tenantId, quantity: totalUnits },
          update: { quantity: { increment: totalUnits } },
        })
      }
    })
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      // Duplicate apply for the same checkout session — already processed.
      return
    }
    throw err
  }
}
