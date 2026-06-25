'use client'

import { useState, useActionState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { deleteAccount } from '@/actions/auth'

export function DeleteAccountDialog() {
  const t = useTranslations('Auth')
  const tc = useTranslations('Common')
  const [open, setOpen] = useState(false)
  const [state, dispatch, isPending] = useActionState(deleteAccount, undefined)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-sm text-destructive underline underline-offset-4 hover:no-underline cursor-pointer">
          {t('deleteAccountTrigger')}
        </button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">{t('deleteAccountTitle')}</DialogTitle>
          <DialogDescription>
            {t('deleteAccountDescription')}
          </DialogDescription>
        </DialogHeader>

        <form action={dispatch} className="flex flex-col gap-4">
          {state && !state.ok && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="da-currentPassword">{t('currentPasswordLabel')}</Label>
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
                  aria-label={showPassword ? t('hidePassword') : t('showPassword')}
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
            {isPending ? tc('deleting') : t('deleteAccountSubmit')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
