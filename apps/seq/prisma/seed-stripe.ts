// Run with: npx tsx prisma/seed-stripe-packages.ts
// Requires STRIPE_SECRET_KEY and DATABASE_URL in the environment.
//
// Idempotent: a Package already linked to Stripe is skipped. When the admin
// changes Package.price in BMS, updatePackage nullifies stripePriceId so this
// script creates a fresh Price on next run.

import "dotenv/config"
import Stripe from "stripe"
import { prisma } from "@genealogiq/db"

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required")
if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is required")

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

async function main() {
  const packages = await prisma.package.findMany({
    where:   { isActive: true, price: { gt: 0 } },
    orderBy: { price: "asc" },
  })

  for (const pkg of packages) {
    const priceCents = Math.round(Number(pkg.price) * 100)

    let productId = pkg.stripeProductId
    if (!productId) {
      const product = await stripe.products.create({
        name:        pkg.name,
        description: pkg.description ?? undefined,
        metadata:    { packageId: pkg.id, qrPerPackage: String(pkg.quantity) },
      })
      productId = product.id
    }

    let priceId = pkg.stripePriceId
    if (!priceId) {
      const price = await stripe.prices.create({
        product:     productId,
        unit_amount: priceCents,
        currency:    "usd",
        nickname:    `${pkg.name} — ${pkg.quantity} QR`,
      })
      priceId = price.id
    }

    await prisma.package.update({
      where: { id: pkg.id },
      data:  { stripeProductId: productId, stripePriceId: priceId },
    })

    console.log(`✓ ${pkg.name} → product=${productId}  price=${priceId}`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
