'use client'

import { useState, useActionState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@genealogiq/ui/button'
import { Input } from '@genealogiq/ui/input'
import { Label } from '@genealogiq/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@genealogiq/ui/card'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@genealogiq/ui/input-group'
import { login } from '@/actions/auth'

export function SignInForm() {
  const t = useTranslations('Auth')
  const [state, dispatch, isPending] = useActionState(login, undefined)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="flex flex-col w-full max-w-sm">
      <div className="relative h-50 w-full">
        <Link href="/" className="relative block h-full w-full">
          <Image
            src="/logo/logo-dark.png"
            alt="Logo"
            fill
            sizes="(max-width: 400px) 100vw, 400px"
            className="object-contain dark:hidden"
            priority
          />
          <Image
            src="/logo/logo-light.png"
            alt="Logo"
            fill
            sizes="(max-width: 400px) 100vw, 400px"
            className="hidden object-contain dark:block"
            priority
          />
        </Link>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>

        <form action={dispatch}>
          <CardContent className="flex flex-col gap-4">
            {state && !state.ok && (
              <p className="text-sm text-destructive">{state.message}</p>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t('emailPlaceholder')}
                autoComplete="email"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t('password')}</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground underline underline-offset-4 hover:no-underline"
                >
                  {t('forgotPassword')}
                </Link>
              </div>
              <InputGroup>
                <InputGroupInput
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </div>
          </CardContent>

          <CardFooter className="mt-6 flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? t('signingIn') : t('signIn')}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
