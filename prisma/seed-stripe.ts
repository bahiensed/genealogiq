// Run with: npx tsx prisma/seed-stripe.ts
// Requires STRIPE_SECRET_KEY and DATABASE_URL in the environment.

import "dotenv/config"
import Stripe from "stripe"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client"

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error("DATABASE_URL is required")
if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is required")

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

async function main() {
  const plans = await prisma.subscription.findMany({
    where:   { isActive: true, price: { gt: 0 } },
    orderBy: { price: "asc" },
  })

  for (const plan of plans) {
    const priceCents        = Math.round(Number(plan.price) * 100)
    const monthlyPriceCents = Math.round((Number(plan.price) / plan.termLength) * 100)

    let productId = plan.stripeProductId
    if (!productId) {
      const product = await stripe.products.create({
        name:        plan.name,
        description: plan.description ?? undefined,
        metadata:    { subscriptionId: plan.id, code: plan.code },
      })
      productId = product.id
    }

    let annualPriceId = plan.stripeAnnualPriceId
    if (!annualPriceId) {
      const ap = await stripe.prices.create({
        product:     productId,
        unit_amount: priceCents,
        currency:    "usd",
        recurring:   { interval: "month", interval_count: plan.termLength },
        nickname:    `${plan.code} annual`,
      })
      annualPriceId = ap.id
    }

    let monthlyPriceId = plan.stripeMonthlyPriceId
    if (!monthlyPriceId) {
      const mp = await stripe.prices.create({
        product:     productId,
        unit_amount: monthlyPriceCents,
        currency:    "usd",
        recurring:   { interval: "month", interval_count: 1 },
        nickname:    `${plan.code} monthly`,
      })
      monthlyPriceId = mp.id
    }

    await prisma.subscription.update({
      where: { id: plan.id },
      data:  {
        stripeProductId:      productId,
        stripeAnnualPriceId:  annualPriceId,
        stripeMonthlyPriceId: monthlyPriceId,
      },
    })

    console.log(`✓ ${plan.code} → product=${productId}  annual=${annualPriceId}  monthly=${monthlyPriceId}`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
