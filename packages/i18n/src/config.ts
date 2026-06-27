// Shared i18n configuration for all Genealogiq apps (cookie-based next-intl,
// no /[locale] route segment). Mirrors the pattern from the eap reference.

export const SUPPORTED_LOCALES = ['en-US', 'pt-BR', 'es-MX'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: SupportedLocale = 'en-US'

export const LOCALE_COOKIE_NAME = 'locale'

/** Order shown in the language switcher: United States, Mexico, Brazil. */
export const LOCALE_DISPLAY_ORDER: SupportedLocale[] = ['en-US', 'es-MX', 'pt-BR']

/** First-visit geo default: ISO country → locale. Anything else falls back to English. */
export const COUNTRY_TO_LOCALE: Record<string, SupportedLocale> = {
  BR: 'pt-BR',
  MX: 'es-MX',
  US: 'en-US',
}

/** Per-locale flag country (ISO) + native label, for the switcher UI. */
export const LOCALE_META: Record<SupportedLocale, { country: string; label: string }> = {
  'pt-BR': { country: 'BR', label: 'Português' },
  'es-MX': { country: 'MX', label: 'Español' },
  'en-US': { country: 'US', label: 'English' },
}

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}
