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
import { changePassword } from '@/actions/auth.actions'

export function ChangePasswordDialog() {
  const t = useTranslations('Auth')
  const tc = useTranslations('Common')
  const [open, setOpen] = useState(false)
  const [state, dispatch, isPending] = useActionState(changePassword, undefined)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-sm text-foreground underline underline-offset-4 hover:no-underline cursor-pointer">
          {t('changePasswordTrigger')}
        </button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('changePasswordTitle')}</DialogTitle>
          <DialogDescription>{t('changePasswordDescription')}</DialogDescription>
        </DialogHeader>

        <form action={dispatch} className="flex flex-col gap-4">
          {state && !state.ok && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}
          {state?.ok && state.message && (
            <p className="text-sm text-green-600">{state.message}</p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cp-currentPassword">{t('currentPasswordLabel')}</Label>
            <InputGroup aria-invalid={!!state?.fieldErrors?.currentPassword}>
              <InputGroupInput
                id="cp-currentPassword"
                name="currentPassword"
                type={showCurrent ? "text" : "password"}
                autoComplete="current-password"
                aria-invalid={!!state?.fieldErrors?.currentPassword}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  onClick={() => setShowCurrent((v) => !v)}
                  aria-label={showCurrent ? t('hidePassword') : t('showPassword')}
                >
                  {showCurrent ? <EyeOff /> : <Eye />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {state?.fieldErrors?.currentPassword?.[0] && (
              <p className="text-xs text-destructive">{state.fieldErrors.currentPassword[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cp-newPassword">{t('newPasswordLabel')}</Label>
            <InputGroup aria-invalid={!!state?.fieldErrors?.newPassword}>
              <InputGroupInput
                id="cp-newPassword"
                name="newPassword"
                type={showNew ? "text" : "password"}
                autoComplete="new-password"
                aria-invalid={!!state?.fieldErrors?.newPassword}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  onClick={() => setShowNew((v) => !v)}
                  aria-label={showNew ? t('hidePassword') : t('showPassword')}
                >
                  {showNew ? <EyeOff /> : <Eye />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {state?.fieldErrors?.newPassword?.[0] && (
              <p className="text-xs text-destructive">{state.fieldErrors.newPassword[0]}</p>
            )}
          </div>

          <Button type="submit" className="w-full mt-2" disabled={isPending}>
            {isPending ? tc('saving') : t('changePasswordSubmit')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
