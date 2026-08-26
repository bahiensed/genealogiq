import { LOCALE_DISPLAY_ORDER } from "@genealogiq/i18n"

/**
 * The catalogue is priced in three currencies and the active locale picks one.
 *
 * Douglas's rule, and it governs price and coupon together: a sale made in
 * Portuguese charges in reais and may only use a real-denominated coupon; in
 * English, dollars. So currency is never a separate question the operator has
 * to answer — it follows the interface they are already using.
 *
 * Unknown locales fall back to USD, which is also the only currency every
 * catalogue row is guaranteed to have had historically.
 */
export const APP_CURRENCIES = ['usd', 'brl', 'mxn'] as const
export type AppCurrency = (typeof APP_CURRENCIES)[number]

const BY_LOCALE: Record<string, AppCurrency> = {
  'pt-BR': 'brl',
  'es-MX': 'mxn',
  'en-US': 'usd',
}

export function currencyForLocale(locale: string): AppCurrency {
  return BY_LOCALE[locale] ?? BY_LOCALE[locale.split('-')[0] === 'pt' ? 'pt-BR'
    : locale.split('-')[0] === 'es' ? 'es-MX'
    : 'en-US']
}

/** Uppercase ISO code, as Intl.NumberFormat and Stripe's dashboard want it. */
export function currencyCode(currency: AppCurrency): string {
  return currency.toUpperCase()
}

/**
 * The order the three currencies are shown in, anywhere they appear together.
 *
 * DERIVED from the language switcher's own order rather than written out again:
 * the rule is that money follows the interface, so a second hand-kept list
 * would be free to drift from the one users actually see. Change
 * LOCALE_DISPLAY_ORDER and this follows.
 *
 * Today that reads United States, Mexico, Brazil — USD, MXN, BRL.
 */
export const CURRENCY_DISPLAY_ORDER: readonly AppCurrency[] =
  LOCALE_DISPLAY_ORDER.map(currencyForLocale)

/** Uppercase codes, for the rows and columns that carry ISO strings. */
export const CURRENCY_CODE_ORDER: readonly string[] =
  CURRENCY_DISPLAY_ORDER.map((c) => c.toUpperCase())

/** Sorts anything carrying an uppercase ISO currency code into display order. */
export function byCurrencyDisplayOrder<T extends { currency: string }>(a: T, b: T): number {
  const rank = (code: string) => {
    const i = CURRENCY_CODE_ORDER.indexOf(code.toUpperCase())
    // An unknown currency sorts last rather than first: a row we do not price
    // in should never lead the list it appears in.
    return i === -1 ? CURRENCY_CODE_ORDER.length : i
  }
  return rank(a.currency) - rank(b.currency)
}
