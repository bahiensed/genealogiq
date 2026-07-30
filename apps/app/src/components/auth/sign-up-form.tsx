'use client'

import { useMemo, useState, useEffect, useActionState, startTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signUp } from '@/actions/auth.actions'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldLabel } from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button'
import { getSignUpSchema, type SignUpFormValues } from '@/schemas/auth.schema'

export function SignUpForm() {
  const t = useTranslations('Auth')
  const tErr = useTranslations('Errors')
  const [state, dispatch, isPending] = useActionState(signUp, undefined)
  const [showPassword, setShowPassword] = useState(false)
  const callbackUrl = useSearchParams().get('callbackUrl')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    resolver: useMemo(() => zodResolver(getSignUpSchema(tErr, t)), [tErr, t]),
  })

  // The server can additionally reject an email that passed client-side format
  // validation (already in use). That server error should stick around only
  // until the user edits the field again — after that it's stale.
  const [emailServerErrorDismissed, setEmailServerErrorDismissed] = useState(false)
  useEffect(() => setEmailServerErrorDismissed(false), [state])

  const { onChange: emailOnChange, ...emailField } = register('email')

  const onValid = (data: SignUpFormValues) => {
    const formData = new FormData()
    formData.set('firstName', data.firstName)
    formData.set('lastName', data.lastName)
    formData.set('email', data.email)
    formData.set('password', data.password)
    if (callbackUrl) formData.set('callbackUrl', callbackUrl)
    startTransition(() => dispatch(formData))
  }

  const emailError = errors.email?.message
    ?? (!emailServerErrorDismissed ? state?.fieldErrors?.email?.[0] : undefined)

  return (
    <div className="animate-fade-in w-full max-w-md">
      <div className="flex flex-col items-center text-center mb-8">
        <Image src="/tree-dark.png" alt="Genealogiq" width={256} height={177} className="object-contain dark:hidden" style={{ height: "auto" }} priority />
        <Image src="/tree-light.png" alt="Genealogiq" width={256} height={177} className="hidden object-contain dark:block" style={{ height: "auto" }} priority />
      </div>

      <form onSubmit={handleSubmit(onValid)} className="glass-card rounded-2xl p-8 space-y-4">
        {state && !state.ok && (
          <p className="text-sm text-destructive">{state.message}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <FieldLabel htmlFor="firstName" required>{t('firstName')}</FieldLabel>
            <Input
              id="firstName"
              type="text"
              autoComplete="given-name"
              aria-invalid={!!errors.firstName}
              {...register('firstName')}
            />
            {errors.firstName?.message && (
              <p className="text-xs text-destructive">{errors.firstName.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="lastName" required>{t('lastName')}</FieldLabel>
            <Input
              id="lastName"
              type="text"
              autoComplete="family-name"
              aria-invalid={!!errors.lastName}
              {...register('lastName')}
            />
            {errors.lastName?.message && (
              <p className="text-xs text-destructive">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <FieldLabel htmlFor="email" required>{t('email')}</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder={t('emailPlaceholder')}
            autoComplete="email"
            aria-invalid={!!emailError}
            {...emailField}
            onChange={(e) => { emailOnChange(e); setEmailServerErrorDismissed(true) }}
          />
          {emailError && (
            <p className="text-xs text-destructive">{emailError}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <FieldLabel htmlFor="password" required>{t('password')}</FieldLabel>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              className="pr-10"
              {...register('password')}
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
          {errors.password?.message && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? t('creatingAccount') : t('createAccount')}
        </Button>

        <GoogleSignInButton callbackUrl={callbackUrl} />

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs uppercase text-muted-foreground">{t('or')}</span>
          <Separator className="flex-1" />
        </div>

        <p className="text-center text-sm">
          <Link href="/activate" className="text-primary hover:underline font-medium">
            {t('activateGenCode')}
          </Link>
        </p>

        <p className="mt-3 text-center text-sm text-muted-foreground">
          {t('alreadyHaveAccount')}{" "}
          <Link
            href={callbackUrl ? `/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/sign-in"}
            className="text-primary hover:underline font-medium"
          >
            {t('signIn')}
          </Link>
        </p>
      </form>
    </div>
  )
}
