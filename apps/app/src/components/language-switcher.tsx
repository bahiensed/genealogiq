'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Check } from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { updatePreferredLocale } from '@/actions/locale.actions'

const FLAGS: Record<string, typeof BR> = { BR, MX, US }

interface Props {
  /** Called once a language is picked, so an enclosing menu can close itself. */
  onSelected?: () => void
}

export function LanguageSwitcher({ onSelected }: Props) {
  const raw = useLocale()
  const locale: SupportedLocale = isSupportedLocale(raw) ? raw : DEFAULT_LOCALE
  const t = useTranslations('Nav')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleSelect(value: SupportedLocale) {
    // Fires even when re-picking the active locale: the user made a choice, so
    // any menu wrapping this switcher should close either way.
    onSelected?.()
    if (value === locale) return
    startTransition(async () => {
      await setLocale(value)
      // Persist the choice for push payload localization (no-op for guests).
      void updatePreferredLocale(value)
      // Ask the service worker to re-capture the /offline snapshot, which is
      // rendered in the (cookie) locale that was active when it was cached.
      navigator.serviceWorker?.controller?.postMessage({ type: "locale-changed" })
      router.refresh()
    })
  }

  const CurrentFlag = FLAGS[LOCALE_META[locale].country]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('language')}
          disabled={isPending}
          className="inline-flex h-9 items-center justify-center rounded-full glass border-0 px-2.5 outline-none transition-colors hover:bg-accent/50 disabled:opacity-50"
        >
          <CurrentFlag className="h-3.5 w-5 rounded-[2px]" title={LOCALE_META[locale].label} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-strong min-w-40">
        {LOCALE_DISPLAY_ORDER.map((code) => {
          const meta = LOCALE_META[code]
          const Flag = FLAGS[meta.country]
          return (
            <DropdownMenuItem key={code} onClick={() => handleSelect(code)} className="gap-2">
              <Flag className="h-3.5 w-5 rounded-[2px]" />
              <span className="flex-1">{meta.label}</span>
              {code === locale && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
