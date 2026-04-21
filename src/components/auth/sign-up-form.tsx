'use client'

import { useState, useActionState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { signUp } from '@/actions/auth'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SignUpForm() {
  const [state, dispatch, isPending] = useActionState(signUp, undefined)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="animate-fade-in w-full max-w-md">
      <div className="flex flex-col items-center text-center mb-8">
        <Image src="/tree-dark.png" alt="Genealogiq" width={256} height={256} className="object-contain dark:hidden" priority />
        <Image src="/tree-light.png" alt="Genealogiq" width={256} height={256} className="hidden object-contain dark:block" priority />
      </div>

      <form action={dispatch} className="glass-card rounded-2xl p-8 space-y-4">
        {state?.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
              aria-invalid={!!state?.errors?.firstName}
            />
            {state?.errors?.firstName?.[0] && (
              <p className="text-xs text-destructive">{state.errors.firstName[0]}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
              aria-invalid={!!state?.errors?.lastName}
            />
            {state?.errors?.lastName?.[0] && (
              <p className="text-xs text-destructive">{state.errors.lastName[0]}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            aria-invalid={!!state?.errors?.email}
          />
          {state?.errors?.email?.[0] && (
            <p className="text-xs text-destructive">{state.errors.email[0]}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              aria-invalid={!!state?.errors?.password}
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
          {state?.errors?.password?.[0] && (
            <p className="text-xs text-destructive">{state.errors.password[0]}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Creating account…" : "Create account"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
