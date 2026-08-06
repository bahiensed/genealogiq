// One-off production cleanup — run manually, once, after the monthlyPrice
// migration + code changes (BMS + APP) are deployed.
// Run with: npx tsx prisma/consolidate-to-free-premium.ts
// Requires STRIPE_SECRET_KEY and DATABASE_URL in the environment.
//
// What it does, in order:
//   1. Cancels Douglas's own test Stripe subscription running on CENTURY.
//   2. Archives the DECADE/CENTURY Stripe Prices + Products (Stripe doesn't
//      allow hard-deleting a Price, only deactivating it).
//   3. Deletes every AppSale row attached to DECADE or CENTURY (test/legacy
//      data, confirmed no real paying customer besides the test subscription
//      above) — every affected user reverts to FREE immediately.
//   4. Deletes the DECADE and CENTURY Subscription rows.
//   5. Creates the new PREMIUM Subscription row (monthlyPrice set explicitly
//      so it stores a real annual discount, not a proportional split).
//
// After this script: open the new PREMIUM row in the BMS admin and click
// "Sync with Stripe" to provision its real Stripe Product/Prices.

import "dotenv/config"
import Stripe from "stripe"
import { prisma } from "@genealogiq/db"

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required")
if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is required")

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Douglas's own test subscription, found live on CENTURY during investigation.
const TEST_STRIPE_SUBSCRIPTION_ID = "sub_1ThXPhIYiaGZjy4L2Tat9IW1"

const LEGACY_CODES = ["DECADE", "CENTURY"] as const

// Adjust before running if a different value is wanted — this is "how many
// profiles one PREMIUM sale directly covers" (legacy direct-assignment path),
// a separate concept from plan-quotas.ts's memorialsMax (the guardian-level
// cascade cap), which already governs the common case.
const PREMIUM_MAX_PROFILES = 1
const PREMIUM_PRICE = 23.99
const PREMIUM_MONTHLY_PRICE = 2.99
const PREMIUM_TERM_LENGTH = 12

async function main() {
  console.log("Step 1: canceling test Stripe subscription…")
  try {
    await stripe.subscriptions.cancel(TEST_STRIPE_SUBSCRIPTION_ID)
    console.log(`  ✓ canceled ${TEST_STRIPE_SUBSCRIPTION_ID}`)
  } catch (e) {
    console.warn(`  ! could not cancel ${TEST_STRIPE_SUBSCRIPTION_ID} (already canceled?):`, (e as Error).message)
  }

  const legacyPlans = await prisma.subscription.findMany({
    where:  { code: { in: [...LEGACY_CODES] } },
    select: { id: true, code: true, stripeProductId: true, stripeAnnualPriceIdUsd: true, stripeMonthlyPriceIdUsd: true },
  })

  console.log("Step 2: archiving legacy Stripe Prices + Products…")
  for (const plan of legacyPlans) {
    for (const priceId of [plan.stripeAnnualPriceIdUsd, plan.stripeMonthlyPriceIdUsd]) {
      if (!priceId) continue
      try {
        await stripe.prices.update(priceId, { active: false })
        console.log(`  ✓ archived price ${priceId} (${plan.code})`)
      } catch (e) {
        console.warn(`  ! could not archive price ${priceId}:`, (e as Error).message)
      }
    }
    if (plan.stripeProductId) {
      try {
        await stripe.products.update(plan.stripeProductId, { active: false })
        console.log(`  ✓ archived product ${plan.stripeProductId} (${plan.code})`)
      } catch (e) {
        console.warn(`  ! could not archive product ${plan.stripeProductId}:`, (e as Error).message)
      }
    }
  }

  console.log("Step 3: deleting AppSale rows attached to DECADE/CENTURY…")
  const deletedSales = await prisma.appSale.deleteMany({
    where: { subscription: { code: { in: [...LEGACY_CODES] } } },
  })
  console.log(`  ✓ deleted ${deletedSales.count} AppSale row(s)`)

  console.log("Step 4: deleting DECADE/CENTURY Subscription rows…")
  const deletedPlans = await prisma.subscription.deleteMany({
    where: { code: { in: [...LEGACY_CODES] } },
  })
  console.log(`  ✓ deleted ${deletedPlans.count} Subscription row(s)`)

  console.log("Step 5: creating PREMIUM Subscription row…")
  const existing = await prisma.subscription.findUnique({ where: { code: "PREMIUM" } })
  if (existing) {
    console.log("  ✓ PREMIUM already exists, skipping create")
  } else {
    const premium = await prisma.subscription.create({
      data: {
        code:         "PREMIUM",
        name:         "Premium",
        isActive:     true,
        maxProfiles:  PREMIUM_MAX_PROFILES,
        termLength:   PREMIUM_TERM_LENGTH,
        priceUsd:        PREMIUM_PRICE,
        monthlyPriceUsd: PREMIUM_MONTHLY_PRICE,
      },
    })
    console.log(`  ✓ created PREMIUM (${premium.id}) — $${PREMIUM_MONTHLY_PRICE}/mo or $${PREMIUM_PRICE}/yr`)
  }

  console.log("\nDone. Next: open the PREMIUM row in BMS and click \"Sync with Stripe\".")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
