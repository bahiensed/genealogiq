'use client'

import { useState, useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@genealogiq/ui/button'
import { Label } from '@genealogiq/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@genealogiq/ui/dialog'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@genealogiq/ui/input-group'
import { deleteAccount } from '@/actions/auth'

export function DeleteAccountDialog() {
  const [open, setOpen] = useState(false)
  const [state, dispatch, isPending] = useActionState(deleteAccount, undefined)
  const [showPassword, setShowPassword] = useState(false)
  const t  = useTranslations('Account')
  const ta = useTranslations('Auth')

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">{t('deleteAccount.trigger')}</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">{t('deleteAccount.title')}</DialogTitle>
          <DialogDescription>
            {t('deleteAccount.description')}
          </DialogDescription>
        </DialogHeader>

        <form action={dispatch} className="flex flex-col gap-4">
          {state && !state.ok && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="da-currentPassword">{t('currentPassword')}</Label>
            <InputGroup aria-invalid={!!state?.fieldErrors?.currentPassword}>
              <InputGroupInput
                id="da-currentPassword"
                name="currentPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                aria-invalid={!!state?.fieldErrors?.currentPassword}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? ta('hidePassword') : ta('showPassword')}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {state?.fieldErrors?.currentPassword?.[0] && (
              <p className="text-xs text-destructive">{state.fieldErrors.currentPassword[0]}</p>
            )}
          </div>

          <Button type="submit" variant="destructive" className="w-full mt-2" disabled={isPending}>
            {isPending ? t('deleteAccount.submitting') : t('deleteAccount.submit')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
