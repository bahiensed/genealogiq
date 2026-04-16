'use client'

import { useActionState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { forgotPassword } from '@/actions/auth'

export function ForgotPasswordForm() {
  const [state, dispatch, isPending] = useActionState(forgotPassword, undefined)

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
          <CardTitle>Forgot your password?</CardTitle>
          <CardDescription>
            Enter your email and we will send you a link to reset your password.
          </CardDescription>
        </CardHeader>

        <form action={dispatch}>
          <CardContent className="flex flex-col gap-4">
            {state?.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail:</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
              />
            </div>
          </CardContent>

          <CardFooter className="mt-6 flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Sending…" : "Send link"}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Remember your password?{" "}
              <Link
                href="/sign-in"
                className="text-foreground underline underline-offset-4 hover:no-underline"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
