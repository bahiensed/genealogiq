'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import BR from 'country-flag-icons/react/3x2/BR'
import MX from 'country-flag-icons/react/3x2/MX'
import US from 'country-flag-icons/react/3x2/US'
import {
  setLocale,
  LOCALE_DISPLAY_ORDER,
  LOCALE_META,
  DEFAULT_LOCALE,
  isSupportedLocale,
  type SupportedLocale,
} from '@genealogiq/i18n'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@genealogiq/ui/select'

const FLAGS: Record<string, typeof BR> = { BR, MX, US }

export function LanguageSwitcher() {
  const raw = useLocale()
  const locale: SupportedLocale = isSupportedLocale(raw) ? raw : DEFAULT_LOCALE
  const t = useTranslations('Nav')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleChange(value: string) {
    startTransition(async () => {
      await setLocale(value as SupportedLocale)
      router.refresh()
    })
  }

  const CurrentFlag = FLAGS[LOCALE_META[locale].country]

  return (
    <Select value={locale} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger aria-label={t('language')} className="h-9 w-auto gap-1.5 px-2.5">
        <CurrentFlag className="h-3.5 w-5 rounded-[2px]" title={LOCALE_META[locale].label} />
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        {LOCALE_DISPLAY_ORDER.map((code) => {
          const meta = LOCALE_META[code]
          const Flag = FLAGS[meta.country]
          return (
            <SelectItem key={code} value={code}>
              <span className="flex items-center gap-2">
                <Flag className="h-3.5 w-5 rounded-[2px]" />
                {meta.label}
              </span>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
