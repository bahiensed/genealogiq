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
