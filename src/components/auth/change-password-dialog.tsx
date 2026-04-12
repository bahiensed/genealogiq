'use client'

import { useState, useActionState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { changePassword } from '@/actions/auth'

export function ChangePasswordDialog() {
  const [open, setOpen] = useState(false)
  const [state, dispatch, isPending] = useActionState(changePassword, undefined)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-sm text-foreground underline underline-offset-4 hover:no-underline cursor-pointer">
          Alterar Senha
        </button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar senha</DialogTitle>
          <DialogDescription>Digite sua senha atual e escolha uma nova.</DialogDescription>
        </DialogHeader>

        <form action={dispatch} className="flex flex-col gap-4">
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          {state?.success && (
            <p className="text-sm text-green-600">{state.success}</p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cp-currentPassword">Senha atual:</Label>
            <InputGroup aria-invalid={!!state?.errors?.currentPassword}>
              <InputGroupInput
                id="cp-currentPassword"
                name="currentPassword"
                type={showCurrent ? "text" : "password"}
                autoComplete="current-password"
                aria-invalid={!!state?.errors?.currentPassword}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  onClick={() => setShowCurrent((v) => !v)}
                  aria-label={showCurrent ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showCurrent ? <EyeOff /> : <Eye />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {state?.errors?.currentPassword?.[0] && (
              <p className="text-xs text-destructive">{state.errors.currentPassword[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cp-newPassword">Nova senha:</Label>
            <InputGroup aria-invalid={!!state?.errors?.newPassword}>
              <InputGroupInput
                id="cp-newPassword"
                name="newPassword"
                type={showNew ? "text" : "password"}
                autoComplete="new-password"
                aria-invalid={!!state?.errors?.newPassword}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  onClick={() => setShowNew((v) => !v)}
                  aria-label={showNew ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showNew ? <EyeOff /> : <Eye />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {state?.errors?.newPassword?.[0] && (
              <p className="text-xs text-destructive">{state.errors.newPassword[0]}</p>
            )}
          </div>

          <Button type="submit" className="w-full mt-2" disabled={isPending}>
            {isPending ? "Salvando…" : "Alterar senha"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
