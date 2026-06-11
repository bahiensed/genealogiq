'use client'

import { useState, useActionState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { AuthCard } from '@/components/auth/auth-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resetPassword } from '@/actions/auth'

interface Props {
  token: string
  callbackUrl?: string
}

export function ResetPasswordForm({ token, callbackUrl }: Props) {
  const [state, dispatch, isPending] = useActionState(resetPassword, undefined)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <AuthCard title="Reset password" description="Enter your new password below.">
      <form action={dispatch} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}

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
    </AuthCard>
  )
}
