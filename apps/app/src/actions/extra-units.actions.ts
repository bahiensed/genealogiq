"use server"

import { getTranslations } from "next-intl/server"
import { resolveLocale } from "@genealogiq/i18n/server"
import { ok, fail, type ActionResult } from "@genealogiq/core"
import { verifySession } from "@/lib/dal"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { ensureStripeCustomer } from "@/lib/billing"
import { getMemorialFeatures } from "@/lib/subscription"
import { LOCALE_TO_CURRENCY, resolveCurrency, priceForCurrency, stripeIdForCurrency } from "@/lib/currency"
import type { ExtraUnitResource } from "@/lib/extra-units"

// A guardian's own tier picks which (resource, tier) price row applies.
// Falls back to PREMIUM when the exact tier has no row of its own (e.g. a
// PHYSICAL_QR-licensed guardian) — never falls back to FREE, since FREE not
// having a row (MEMORIAL) means "not purchasable at this tier," not "missing
// data."
async function findExtraUnitPrice(resource: ExtraUnitResource, tier: string) {
  const exact = await prisma.extraUnitPrice.findUnique({ where: { resource_tier: { resource, tier } } })
  if (exact) return exact
  if (tier !== "FREE") {
    return prisma.extraUnitPrice.findUnique({ where: { resource_tier: { resource, tier: "PREMIUM" } } })
  }
  return null
}

export async function createExtraUnitCheckoutSession(
  resource: ExtraUnitResource,
  returnPath: string = "/home",
): Promise<ActionResult<{ url: string }>> {
  const t = await getTranslations("Actions")
  const session = await verifySession()

  const tier = (await getMemorialFeatures(session.user.id)).code
  const priceRow = await findExtraUnitPrice(resource, tier)
  if (!priceRow) return fail(t("extraUnits.notPurchasable"))

  const priceFields = {
    priceUsd: priceRow.priceUsd ? Number(priceRow.priceUsd) : null,
    priceBrl: priceRow.priceBrl ? Number(priceRow.priceBrl) : null,
    priceMxn: priceRow.priceMxn ? Number(priceRow.priceMxn) : null,
  }

  const viewerCurrency = LOCALE_TO_CURRENCY[await resolveLocale()]
  const currency = resolveCurrency(priceFields, viewerCurrency)
  const stripePriceId = stripeIdForCurrency(priceRow, currency)
  const price = priceForCurrency(priceFields, currency)
  if (!stripePriceId || price == null) return fail(t("extraUnits.notWired"))

  const customerId = await ensureStripeCustomer(session.user.id)
  const appUrl = process.env.APP_URL ?? "http://localhost:3000"
  const metadata = { buyerId: session.user.id, resource, tier: priceRow.tier, currency }

  const checkout = await stripe.checkout.sessions.create({
    mode:                  "payment",
    customer:              customerId,
    line_items:            [{ price: stripePriceId, quantity: 1 }],
    client_reference_id:   session.user.id,
    metadata,
    payment_intent_data:   { metadata },
    success_url:           `${appUrl}${returnPath}?status=success`,
    cancel_url:            `${appUrl}${returnPath}?status=cancel`,
    allow_promotion_codes: true,
  })

  if (!checkout.url) return fail(t("billing.noCheckoutUrl"))
  return ok({ url: checkout.url })
}
