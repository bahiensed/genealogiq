'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { forgotPassword } from '@/actions/auth'

export function ForgotPasswordForm() {
  const [state, dispatch, isPending] = useActionState(forgotPassword, undefined)

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Esqueceu a senha?</CardTitle>
        <CardDescription>
          Digite seu e-mail e enviaremos um link para redefinir sua senha.
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
            {isPending ? "Enviando…" : "Enviar link"}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Lembrou a senha?{" "}
            <Link
              href="/sign-in"
              className="text-foreground underline underline-offset-4 hover:no-underline"
            >
              Entrar
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
