'use client'

import { useActionState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@genealogiq/ui/button'
import { Input } from '@genealogiq/ui/input'
import { Label } from '@genealogiq/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@genealogiq/ui/card'
import { forgotPassword } from '@/actions/auth'

export function ForgotPasswordForm() {
  const [state, dispatch, isPending] = useActionState(forgotPassword, undefined)
  const t = useTranslations('Auth')

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
          <CardTitle>{t('forgot.title')}</CardTitle>
          <CardDescription>
            {t('forgot.description')}
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
          </CardContent>

          <CardFooter className="mt-6 flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? t('forgot.submitting') : t('forgot.submit')}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              {t('forgot.remembered')}{" "}
              <Link
                href="/sign-in"
                className="text-foreground underline underline-offset-4 hover:no-underline"
              >
                {t('signIn')}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
