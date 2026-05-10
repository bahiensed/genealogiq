'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { forgotPassword } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ForgotPasswordForm() {
  const [state, dispatch, isPending] = useActionState(forgotPassword, undefined)

  return (
    <div className="animate-fade-in w-full max-w-md">
      <div className="flex flex-col items-center text-center mb-8">
        <Image src="/tree-dark.png" alt="Genealogiq" width={256} height={256} className="object-contain dark:hidden" style={{ height: "auto" }} priority />
        <Image src="/tree-light.png" alt="Genealogiq" width={256} height={256} className="hidden object-contain dark:block" style={{ height: "auto" }} priority />
      </div>

      <form action={dispatch} className="glass-card rounded-2xl p-8 space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Forgot your password?</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {"Enter your email below and we'll send you a reset link."}
          </p>
        </div>

        {state?.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="your@email.com"
            autoComplete="email"
          />
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Sending…" : "Send reset link"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link href="/sign-in" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
