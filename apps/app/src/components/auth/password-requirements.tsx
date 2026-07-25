'use client'

import { useTranslations } from 'next-intl'
import { Check } from 'lucide-react'

const RULES = [
  { key: 'passwordRuleLength', test: (value: string) => value.length >= 8 },
] as const

export function PasswordRequirements({ password }: { password: string }) {
  const t = useTranslations('Auth')

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{t('passwordRequirementsTitle')}</p>
      <ul className="space-y-1">
        {RULES.map((rule) => {
          const met = rule.test(password)
          return (
            <li
              key={rule.key}
              className={`flex items-center gap-1.5 text-xs transition-colors ${
                met ? 'text-emerald-600' : 'text-muted-foreground'
              }`}
            >
              <Check className={`h-3.5 w-3.5 shrink-0 ${met ? 'opacity-100' : 'opacity-30'}`} />
              {t(rule.key)}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
