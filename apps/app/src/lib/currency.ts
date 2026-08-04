import type { SupportedLocale } from "@genealogiq/i18n"

export type Currency = "USD" | "BRL" | "MXN"

export const LOCALE_TO_CURRENCY: Record<SupportedLocale, Currency> = {
  "en-US": "USD",
  "pt-BR": "BRL",
  "es-MX": "MXN",
}

// A Subscription row's raw per-currency columns (Prisma Decimal already
// converted to number by the caller). USD is always populated; BRL/MXN are
// null until an admin configures them in BMS.
export interface PlanCurrencyFields {
  priceUsd:        number
  monthlyPriceUsd: number | null
  priceBrl:        number | null
  monthlyPriceBrl: number | null
  priceMxn:        number | null
  monthlyPriceMxn: number | null
}

export interface PlanStripeIdFields {
  stripeAnnualPriceIdUsd:  string | null
  stripeMonthlyPriceIdUsd: string | null
  stripeAnnualPriceIdBrl:  string | null
  stripeMonthlyPriceIdBrl: string | null
  stripeAnnualPriceIdMxn:  string | null
  stripeMonthlyPriceIdMxn: string | null
}

/**
 * Which currency actually applies for this plan: the requested one, unless
 * its annual price isn't configured yet (BRL/MXN not filled in in BMS), in
 * which case USD — never an empty/blocked price. USD's annual price is
 * required in the schema, so this always resolves to something real.
 */
export function resolveCurrency(plan: Pick<PlanCurrencyFields, "priceBrl" | "priceMxn">, requested: Currency): Currency {
  if (requested === "BRL" && plan.priceBrl != null) return "BRL"
  if (requested === "MXN" && plan.priceMxn != null) return "MXN"
  return "USD"
}

/**
 * The raw annual/monthly price pair for a resolved currency (monthly may
 * still be null — same "derive from price/termLength" sentinel already
 * handled by monthlyEquivalent() in subscriptions-grid.tsx, unchanged here).
 */
export function pricesForCurrency(plan: PlanCurrencyFields, currency: Currency): { price: number; monthlyPrice: number | null } {
  if (currency === "BRL") return { price: plan.priceBrl ?? plan.priceUsd, monthlyPrice: plan.monthlyPriceBrl }
  if (currency === "MXN") return { price: plan.priceMxn ?? plan.priceUsd, monthlyPrice: plan.monthlyPriceMxn }
  return { price: plan.priceUsd, monthlyPrice: plan.monthlyPriceUsd }
}

/** The Stripe annual/monthly Price id pair for a resolved currency. */
export function stripeIdsForCurrency(plan: PlanStripeIdFields, currency: Currency): { annual: string | null; monthly: string | null } {
  if (currency === "BRL") return { annual: plan.stripeAnnualPriceIdBrl, monthly: plan.stripeMonthlyPriceIdBrl }
  if (currency === "MXN") return { annual: plan.stripeAnnualPriceIdMxn, monthly: plan.stripeMonthlyPriceIdMxn }
  return { annual: plan.stripeAnnualPriceIdUsd, monthly: plan.stripeMonthlyPriceIdUsd }
}
