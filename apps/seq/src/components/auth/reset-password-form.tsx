'use client'

import { useState, useActionState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { resetPassword } from '@/actions/auth'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@genealogiq/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@genealogiq/ui/card'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@genealogiq/ui/input-group'
import { Label } from '@genealogiq/ui/label'

interface Props {
  token: string
}

export function ResetPasswordForm({ token }: Props) {
  const [state, dispatch, isPending] = useActionState(resetPassword, undefined)
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
          <CardTitle>Define password</CardTitle>
          <CardDescription>Type your new password</CardDescription>
        </CardHeader>

        <form action={dispatch}>
          <input type="hidden" name="token" value={token} />

          <CardContent className="flex flex-col gap-4">
            {state?.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">New password:</Label>
              <InputGroup aria-invalid={!!state?.errors?.password}>
                <InputGroupInput
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  aria-invalid={!!state?.errors?.password}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              {state?.errors?.password?.[0] && (
                <p className="text-xs text-destructive">{state.errors.password[0]}</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="mt-6">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Saving…" : "Save new password"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
