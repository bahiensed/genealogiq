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
import { prisma } from '@genealogiq/db'
import { generateGenCode } from '@genealogiq/core'

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
    const available = await prisma.genCode.count({
      where: { tenantId: ctx.tenantId, status: 'AVAILABLE' },
    })
    console.log(`Unsold licenses for tenant: ${available}`)
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

  const totalUnits     = pkg.quantity * ctx.quantity
  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : (session.payment_intent as { id: string } | null)?.id ?? null

  console.log(`\nPackage     : ${pkg.name}`)
  console.log(`Units       : ${pkg.quantity} × ${ctx.quantity} = ${totalUnits}`)
  console.log(`Payment PI  : ${paymentIntentId ?? '(none)'}`)
  console.log(`Tenant ID   : ${ctx.tenantId}`)
  console.log(`Sold by     : ${ctx.soldById}`)

  if (dryRun) {
    console.log('\n[dry-run] No changes made.')
    return
  }

  // 4. Apply atomically — mirrors lib/billing.ts (PHYSICAL → licenses, DIGITAL → inventory).
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

    const licenses = Array.from({ length: totalUnits }, () => ({
      genCode:   generateGenCode(),
      saleId:    sale.id,
      packageId: ctx.packageId!,
      tenantId:  ctx.tenantId!,
    }))
    await tx.genCode.createMany({ data: licenses })
    console.log(`Licenses        : ${totalUnits} license(s) created`)
  })

  // Sale.stripeSessionId unique constraint ensures future webhook replays are idempotent.
  console.log('\n✅ Done.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
