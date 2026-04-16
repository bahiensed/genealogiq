'use client'

import { useState, useActionState } from 'react'
import { requestEmailChange } from '@/actions/auth'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'

export function ChangeEmailDialog() {
  const [open, setOpen] = useState(false)
  const [state, dispatch, isPending] = useActionState(requestEmailChange, undefined)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-sm text-foreground underline underline-offset-4 hover:no-underline cursor-pointer">
          Change Email
        </button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change email</DialogTitle>
          <DialogDescription>
            A confirmation link will be sent to the new address
          </DialogDescription>
        </DialogHeader>

        <form action={dispatch} className="flex flex-col gap-4">
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          {state?.success && (
            <p className="text-sm text-green-600">{state.success}</p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ce-newEmail">New email:</Label>
            <Input
              id="ce-newEmail"
              name="newEmail"
              type="email"
              placeholder="novo@email.com"
              autoComplete="email"
              aria-invalid={!!state?.errors?.newEmail}
            />
            {state?.errors?.newEmail?.[0] && (
              <p className="text-xs text-destructive">{state.errors.newEmail[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ce-currentPassword">Current password:</Label>
            <InputGroup aria-invalid={!!state?.errors?.currentPassword}>
              <InputGroupInput
                id="ce-currentPassword"
                name="currentPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                aria-invalid={!!state?.errors?.currentPassword}
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
            {state?.errors?.currentPassword?.[0] && (
              <p className="text-xs text-destructive">{state.errors.currentPassword[0]}</p>
            )}
          </div>

          <Button type="submit" className="w-full mt-2" disabled={isPending}>
            {isPending ? "Changing…" : "Change email"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
