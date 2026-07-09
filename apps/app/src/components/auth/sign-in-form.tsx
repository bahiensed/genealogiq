'use client'

import { useState, useActionState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { login } from '@/actions/auth.actions'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldLabel } from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'

export function SignInForm() {
  const t = useTranslations('Auth')
  const [state, dispatch, isPending] = useActionState(login, undefined)
  const [showPassword, setShowPassword] = useState(false)
  const callbackUrl = useSearchParams().get('callbackUrl')

  return (
    <div className="animate-fade-in w-full max-w-md">
      <div className="flex flex-col items-center text-center mb-8">
        <Image src="/tree-dark.png" alt="Genealogiq" width={256} height={256} className="object-contain dark:hidden" style={{ height: "auto" }} priority />
        <Image src="/tree-light.png" alt="Genealogiq" width={256} height={256} className="hidden object-contain dark:block" style={{ height: "auto" }} priority />
      </div>

      <form action={dispatch} className="glass-card rounded-2xl p-6">
        {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
        {state && !state.ok && (
          <p className="mb-4 text-sm text-destructive">{state.message}</p>
        )}

        {/*
          DOM order = TAB order: email → password → submit → forgot → GenCode → create account.
          The grid areas below reposition the "forgot password" link visually into the
          password label row without moving it in the tab sequence (grid placement does
          not affect focus order).
        */}
        <div
          className="grid gap-x-3 gap-y-1.5"
          style={{
            gridTemplateColumns: '1fr auto',
            gridTemplateAreas: [
              '"email email"',
              '"pwLabel forgot"',
              '"pwInput pwInput"',
              '"submit submit"',
              '"divider divider"',
              '"gencode gencode"',
              '"newhere newhere"',
            ].join(' '),
          }}
        >
          <div className="space-y-1.5" style={{ gridArea: 'email' }}>
            <FieldLabel htmlFor="email" required>{t('email')}</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={t('emailPlaceholder')}
              autoComplete="email"
            />
          </div>

          <FieldLabel htmlFor="password" required className="mt-2.5 self-center" style={{ gridArea: 'pwLabel' }}>
            {t('password')}
          </FieldLabel>

          <div className="relative mt-1.5" style={{ gridArea: 'pwInput' }}>
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="pr-10"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? t('hidePassword') : t('showPassword')}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <Button type="submit" className="mt-2.5 w-full" disabled={isPending} style={{ gridArea: 'submit' }}>
            {isPending ? t('signingIn') : t('signIn')}
          </Button>

          <Link
            href="/forgot-password"
            className="mt-2.5 self-center justify-self-end text-xs text-muted-foreground hover:text-foreground transition-colors"
            style={{ gridArea: 'forgot' }}
          >
            {t('forgotPassword')}
          </Link>

          <div className="mt-2.5 flex items-center gap-3" style={{ gridArea: 'divider' }}>
            <Separator className="flex-1" />
            <span className="text-xs uppercase text-muted-foreground">{t('or')}</span>
            <Separator className="flex-1" />
          </div>

          <p className="mt-2.5 text-center text-sm" style={{ gridArea: 'gencode' }}>
            <Link href="/activate" className="text-primary hover:underline font-medium">
              {t('activateGenCode')}
            </Link>
          </p>

          <p className="mt-2 text-center text-sm text-muted-foreground" style={{ gridArea: 'newhere' }}>
            {t('newHere')}{" "}
            <Link
              href={callbackUrl ? `/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/sign-up"}
              className="text-primary hover:underline font-medium"
            >
              {t('createAccount')}
            </Link>
          </p>
        </div>
      </form>
    </div>
  )
}
