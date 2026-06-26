'use client'

import { useState, useActionState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { signUp } from '@/actions/auth.actions'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SignUpForm() {
  const t = useTranslations('Auth')
  const [state, dispatch, isPending] = useActionState(signUp, undefined)
  const [showPassword, setShowPassword] = useState(false)
  const callbackUrl = useSearchParams().get('callbackUrl')

  return (
    <div className="animate-fade-in w-full max-w-md">
      <div className="flex flex-col items-center text-center mb-8">
        <Image src="/tree-dark.png" alt="Genealogiq" width={256} height={256} className="object-contain dark:hidden" style={{ height: "auto" }} priority />
        <Image src="/tree-light.png" alt="Genealogiq" width={256} height={256} className="hidden object-contain dark:block" style={{ height: "auto" }} priority />
      </div>

      <form action={dispatch} className="glass-card rounded-2xl p-8 space-y-4">
        {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
        {state && !state.ok && (
          <p className="text-sm text-destructive">{state.message}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">{t('firstName')}</Label>
            <Input
              id="firstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
              aria-invalid={!!state?.fieldErrors?.firstName}
            />
            {state?.fieldErrors?.firstName?.[0] && (
              <p className="text-xs text-destructive">{state.fieldErrors.firstName[0]}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">{t('lastName')}</Label>
            <Input
              id="lastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
              aria-invalid={!!state?.fieldErrors?.lastName}
            />
            {state?.fieldErrors?.lastName?.[0] && (
              <p className="text-xs text-destructive">{state.fieldErrors.lastName[0]}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">{t('email')}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder={t('emailPlaceholder')}
            autoComplete="email"
            aria-invalid={!!state?.fieldErrors?.email}
          />
          {state?.fieldErrors?.email?.[0] && (
            <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">{t('password')}</Label>
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
          {isPending ? t('creatingAccount') : t('createAccount')}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {t('alreadyHaveAccount')}{" "}
          <Link
            href={callbackUrl ? `/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/sign-in"}
            className="text-primary hover:underline font-medium"
          >
            {t('signIn')}
          </Link>
        </p>

        <p className="text-center text-xs text-muted-foreground">
          <Link href="/activate" className="hover:text-foreground transition-colors">
            {t('haveQrCode')}
          </Link>
        </p>
      </form>
    </div>
  )
}
