'use server'

import { cookies } from 'next/headers'
import { isSupportedLocale, LOCALE_COOKIE_NAME, type SupportedLocale } from './config'

const ONE_YEAR = 60 * 60 * 24 * 365

/** Persists the user's explicit language choice in the `locale` cookie (1 year). */
export async function setLocale(locale: SupportedLocale) {
  if (!isSupportedLocale(locale)) throw new Error('Unsupported locale')
  const cookieStore = await cookies()
  cookieStore.set(LOCALE_COOKIE_NAME, locale, {
    maxAge: ONE_YEAR,
    path: '/',
    sameSite: 'lax',
  })
}
