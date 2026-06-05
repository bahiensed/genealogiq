/**
 * Manually apply a completed Stripe Checkout Session to the DB.
 * Use when a webhook was missed (e.g. trailing-slash URL redirect broke signature).
 *
 * Usage (from genealogiq-seq root):
 *   npx tsx scripts/apply-checkout-session.ts <session-id>
 *   npx tsx scripts/apply-checkout-session.ts <session-id> --dry-run
 */

import 'dotenv/config'
import Stripe from 'stripe'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

// ─── Args ─────────────────────────────────────────────────────────────────────

const args      = process.argv.slice(2)
const sessionId = args.find((a) => !a.startsWith('--'))
const dryRun    = args.includes('--dry-run')

if (!sessionId) {
  console.error('Usage: npx tsx scripts/apply-checkout-session.ts <session-id> [--dry-run]')
  process.exit(1)
}

// ─── Clients ──────────────────────────────────────────────────────────────────

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const prisma  = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Fetch session from Stripe
  const session = await stripe.checkout.sessions.retrieve(sessionId!)
  console.log(`\nCheckout Session : ${session.id}`)
  console.log(`  Status          : ${session.status}`)
  console.log(`  Payment status  : ${session.payment_status}`)
  console.log(`  Mode            : ${session.mode}`)
  console.log(`  Metadata        :`, session.metadata)

  if (session.mode !== 'payment') {
    console.error('\nNot a one-time payment session — abort.')
    process.exit(1)
  }
  if (session.payment_status !== 'paid') {
    console.error(`\nPayment not completed (status: ${session.payment_status}) — abort.`)
    process.exit(1)
  }

  const meta = session.metadata ?? {}
  const ctx = {
    tenantId:  meta.tenantId,
    packageId: meta.packageId,
    quantity:  meta.quantity ? Number(meta.quantity) : undefined,
    soldById:  meta.soldById,
  }

  if (!ctx.tenantId || !ctx.packageId || !ctx.soldById || !ctx.quantity || !Number.isInteger(ctx.quantity)) {
    console.error('\nMissing/invalid metadata:', meta)
    process.exit(1)
  }

  // 2. Already applied?
  const existing = await prisma.sale.findFirst({ where: { stripeSessionId: session.id } })
  if (existing) {
    console.log(`\nAlready applied: Sale ${existing.id} exists for this session.`)
    const inv = await prisma.qrInventory.findUnique({ where: { tenantId: ctx.tenantId } })
    console.log(`QR Inventory for tenant: ${inv?.quantity ?? 0} QR code(s)`)
    return
  }

  // 3. Resolve package
  const pkg = await prisma.package.findUnique({
    where:  { id: ctx.packageId },
    select: { quantity: true, name: true },
  })
  if (!pkg) {
    console.error(`\nPackage ${ctx.packageId} not found in DB — abort.`)
    process.exit(1)
  }

  const totalQRCodes   = pkg.quantity * ctx.quantity
  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : (session.payment_intent as { id: string } | null)?.id ?? null

  console.log(`\nPackage     : ${pkg.name}`)
  console.log(`QR codes    : ${pkg.quantity} × ${ctx.quantity} = ${totalQRCodes}`)
  console.log(`Payment PI  : ${paymentIntentId ?? '(none)'}`)
  console.log(`Tenant ID   : ${ctx.tenantId}`)
  console.log(`Sold by     : ${ctx.soldById}`)

  if (dryRun) {
    console.log('\n[dry-run] No changes made.')
    return
  }

  // 4. Apply atomically
  await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        packageId:             ctx.packageId!,
        tenantId:              ctx.tenantId!,
        soldById:              ctx.soldById!,
        quantity:              ctx.quantity!,
        stripeSessionId:       session.id,
        stripePaymentIntentId: paymentIntentId,
      },
    })
    console.log(`\nCreated Sale    : ${sale.id}`)

    const inv = await tx.qrInventory.upsert({
      where:  { tenantId: ctx.tenantId! },
      create: { tenantId: ctx.tenantId!, quantity: totalQRCodes },
      update: { quantity: { increment: totalQRCodes } },
    })
    console.log(`QR Inventory    : ${inv.quantity} code(s) (tenant ${ctx.tenantId})`)
  })

  // Sale.stripeSessionId unique constraint ensures future webhook replays are idempotent.
  console.log('\n✅ Done.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
