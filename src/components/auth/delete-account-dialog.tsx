'use client'

import { useState, useActionState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { deleteAccount } from '@/actions/auth'

export function DeleteAccountDialog() {
  const [open, setOpen] = useState(false)
  const [state, dispatch, isPending] = useActionState(deleteAccount, undefined)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-sm text-destructive underline underline-offset-4 hover:no-underline cursor-pointer">
          Excluir conta
        </button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">Excluir conta</DialogTitle>
          <DialogDescription>
            Esta ação é irreversível. Todos os seus dados serão permanentemente apagados.
          </DialogDescription>
        </DialogHeader>

        <form action={dispatch} className="flex flex-col gap-4">
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="da-currentPassword">Senha atual:</Label>
            <InputGroup aria-invalid={!!state?.errors?.currentPassword}>
              <InputGroupInput
                id="da-currentPassword"
                name="currentPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                aria-invalid={!!state?.errors?.currentPassword}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {state?.errors?.currentPassword?.[0] && (
              <p className="text-xs text-destructive">{state.errors.currentPassword[0]}</p>
            )}
          </div>

          <Button type="submit" variant="destructive" className="w-full mt-2" disabled={isPending}>
            {isPending ? "Excluindo…" : "Excluir minha conta"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
