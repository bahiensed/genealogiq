'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { forgotPassword } from '@/actions/auth.actions'
import { AuthCard } from '@/components/auth/auth-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldLabel } from '@/components/ui/field'

export function ForgotPasswordForm() {
  const t = useTranslations('Auth')
  const [state, dispatch, isPending] = useActionState(forgotPassword, undefined)

  return (
    <AuthCard
      title={t('forgotTitle')}
      description={t('forgotDescription')}
    >
      <form action={dispatch} className="space-y-4">
        {state && !state.ok && (
          <p className="text-sm text-destructive">{state.message}</p>
        )}

        <div className="space-y-1.5">
          <FieldLabel htmlFor="email" required>{t('email')}</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder={t('emailPlaceholder')}
            autoComplete="email"
          />
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? t('sending') : t('sendResetLink')}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {t('rememberPassword')}{" "}
          <Link href="/sign-in" className="text-primary hover:underline font-medium">
            {t('signIn')}
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}
