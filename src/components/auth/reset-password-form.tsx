'use client'

import { useState, useActionState } from 'react'
import Image from 'next/image'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resetPassword } from '@/actions/auth'

interface Props {
  token: string
}

export function ResetPasswordForm({ token }: Props) {
  const [state, dispatch, isPending] = useActionState(resetPassword, undefined)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="w-full max-w-md animate-fade-in">
      <div className="flex flex-col items-center text-center mb-6">
        <Image src="/tree-dark.png" alt="Genealogiq" width={160} height={160} className="object-contain dark:hidden" priority />
        <Image src="/tree-light.png" alt="Genealogiq" width={160} height={160} className="hidden object-contain dark:block" priority />
      </div>

      <form action={dispatch} className="glass-card rounded-2xl p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Reset password</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter your new password below.</p>
        </div>

        <input type="hidden" name="token" value={token} />

        {state?.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
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
          {isPending ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </div>
  )
}
