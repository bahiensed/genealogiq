import 'server-only'

import { cookies, headers } from 'next/headers'
import {
  COUNTRY_TO_LOCALE,
  DEFAULT_LOCALE,
  isSupportedLocale,
  LOCALE_COOKIE_NAME,
  type SupportedLocale,
} from './config'

/**
 * Resolves the active locale for a request:
 *   1. The `locale` cookie (the user's explicit, persisted choice), if valid.
 *   2. Otherwise the visitor's country via the Vercel geo header
 *      (`x-vercel-ip-country`) mapped to a locale — BR→pt-BR, MX→es-MX, US→en-US.
 *   3. Otherwise English (also the local-dev case, where the geo header is absent).
 */
export async function resolveLocale(): Promise<SupportedLocale> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LOCALE_COOKIE_NAME)?.value
  if (isSupportedLocale(fromCookie)) return fromCookie

  const headerStore = await headers()
  const country = headerStore.get('x-vercel-ip-country')?.toUpperCase()
  if (country && COUNTRY_TO_LOCALE[country]) return COUNTRY_TO_LOCALE[country]

  return DEFAULT_LOCALE
}
