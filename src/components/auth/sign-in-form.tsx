'use client'

import { useState, useActionState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { login } from '@/actions/auth'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SignInForm() {
  const [state, dispatch, isPending] = useActionState(login, undefined)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="animate-fade-in w-full max-w-md">
      <div className="flex flex-col items-center text-center mb-8">
        <Image src="/tree-dark.png" alt="Genealogiq" width={256} height={256} className="object-contain dark:hidden" style={{ height: "auto" }} priority />
        <Image src="/tree-light.png" alt="Genealogiq" width={256} height={256} className="hidden object-contain dark:block" style={{ height: "auto" }} priority />
      </div>

      <form action={dispatch} className="glass-card rounded-2xl p-6 space-y-4">
        {state?.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Signing in…" : "Sign in"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/sign-up" className="text-primary hover:underline font-medium">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  )
}
