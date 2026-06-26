'use client'

import { useState, useActionState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { AuthCard } from '@/components/auth/auth-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resetPassword } from '@/actions/auth.actions'

interface Props {
  token: string
  callbackUrl?: string
}

export function ResetPasswordForm({ token, callbackUrl }: Props) {
  const t = useTranslations('Auth')
  const tc = useTranslations('Common')
  const [state, dispatch, isPending] = useActionState(resetPassword, undefined)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <AuthCard title={t('resetTitle')} description={t('resetDescription')}>
      <form action={dispatch} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}

        {state && !state.ok && (
          <p className="text-sm text-destructive">{state.message}</p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="password">{t('newPassword')}</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              aria-invalid={!!state?.fieldErrors?.password}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? t('hidePassword') : t('showPassword')}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {state?.fieldErrors?.password?.[0] && (
            <p className="text-xs text-destructive">{state.fieldErrors.password[0]}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? tc('saving') : t('saveNewPassword')}
        </Button>
      </form>
    </AuthCard>
  )
}
