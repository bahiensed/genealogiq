'use client'

import { useState, useActionState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { resetPassword } from '@/actions/auth'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@genealogiq/ui/button'
import { Label } from '@genealogiq/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@genealogiq/ui/card'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@genealogiq/ui/input-group'

interface Props {
  token: string
}

export function ResetPasswordForm({ token }: Props) {
  const [state, dispatch, isPending] = useActionState(resetPassword, undefined)
  const [showPassword, setShowPassword] = useState(false)
  const t = useTranslations('Auth')
  const ta = useTranslations('Account')

  return (
    <div className="flex flex-col w-full max-w-sm">
      <div className="relative h-50 w-full">
        <Link href="/" className="relative block h-full w-full">
          <Image
            src="/logo/logo-dark.png"
            alt="Genealogiq"
            fill
            sizes="(max-width: 400px) 100vw, 400px"
            className="object-contain dark:hidden"
            priority
          />
          <Image
            src="/logo/logo-light.png"
            alt="Genealogiq"
            fill
            sizes="(max-width: 400px) 100vw, 400px"
            className="hidden object-contain dark:block"
            priority
          />
        </Link>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('reset.title')}</CardTitle>
          <CardDescription>{t('reset.description')}</CardDescription>
        </CardHeader>

        <form action={dispatch}>
          <input type="hidden" name="token" value={token} />

          <CardContent className="flex flex-col gap-4">
            {state && !state.ok && (
              <p className="text-sm text-destructive">{state.message}</p>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">{ta('newPassword')}</Label>
              <InputGroup aria-invalid={!!state?.fieldErrors?.password}>
                <InputGroupInput
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  aria-invalid={!!state?.fieldErrors?.password}
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
              {state?.fieldErrors?.password?.[0] && (
                <p className="text-xs text-destructive">{state.fieldErrors.password[0]}</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="mt-6">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? t('reset.submitting') : t('reset.submit')}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
