import "server-only"

import { prisma } from "@/lib/prisma"
import { resolveCurrency, pricesForCurrency, type Currency } from "@/lib/currency"

export async function getActivePlan(userId: string) {
  const row = await prisma.appSale.findFirst({
    where: {
      appUserId: userId,
      status:    { in: ["active", "trialing"] },
      currentPeriodEnd: { gt: new Date() },
    },
    orderBy: { currentPeriodEnd: "desc" },
    select: {
      id:                   true,
      cadence:              true,
      currency:             true,
      status:               true,
      currentPeriodEnd:     true,
      cancelAtPeriodEnd:    true,
      stripeSubscriptionId: true,
      subscription: {
        select: {
          id: true, code: true, name: true, termLength: true,
          priceUsd: true, monthlyPriceUsd: true,
          priceBrl: true, monthlyPriceBrl: true,
          priceMxn: true, monthlyPriceMxn: true,
        },
      },
    },
  })
  // currentPeriodEnd / status are nullable in schema (SEQ vendor sales share
  // this table) but the where-clause above guarantees both are set on hit.
  if (!row || !row.currentPeriodEnd || !row.status) return null

  // The currency this sale was ACTUALLY charged in (stored, from the real
  // Stripe Price) — never the viewer's current locale, which may have
  // changed since they subscribed. Null (pre-multi-currency sales) → USD.
  const fields = {
    priceUsd:        Number(row.subscription.priceUsd),
    monthlyPriceUsd: row.subscription.monthlyPriceUsd ? Number(row.subscription.monthlyPriceUsd) : null,
    priceBrl:        row.subscription.priceBrl ? Number(row.subscription.priceBrl) : null,
    monthlyPriceBrl: row.subscription.monthlyPriceBrl ? Number(row.subscription.monthlyPriceBrl) : null,
    priceMxn:        row.subscription.priceMxn ? Number(row.subscription.priceMxn) : null,
    monthlyPriceMxn: row.subscription.monthlyPriceMxn ? Number(row.subscription.monthlyPriceMxn) : null,
  }
  const currency = resolveCurrency(fields, (row.currency as Currency | null) ?? "USD")
  const { price, monthlyPrice } = pricesForCurrency(fields, currency)

  return {
    ...row,
    currentPeriodEnd: row.currentPeriodEnd,
    status:           row.status,
    currency,
    subscription: {
      id:   row.subscription.id,
      code: row.subscription.code,
      name: row.subscription.name,
      termLength: row.subscription.termLength,
      price,
      monthlyPrice,
    },
  }
}

export type ActivePlan = NonNullable<Awaited<ReturnType<typeof getActivePlan>>>
