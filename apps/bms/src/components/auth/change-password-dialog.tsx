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
import { changePassword } from '@/actions/auth'

export function ChangePasswordDialog() {
  const [open, setOpen] = useState(false)
  const [state, dispatch, isPending] = useActionState(changePassword, undefined)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const t  = useTranslations('Account')
  const ta = useTranslations('Auth')

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">{t('changePassword.trigger')}</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('changePassword.title')}</DialogTitle>
          <DialogDescription>{t('changePassword.description')}</DialogDescription>
        </DialogHeader>

        <form action={dispatch} className="flex flex-col gap-4">
          {state && !state.ok && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}
          {state?.ok && state.message && (
            <p className="text-sm text-green-600">{state.message}</p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cp-currentPassword">{t('currentPassword')}</Label>
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
                  aria-label={showCurrent ? ta('hidePassword') : ta('showPassword')}
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
            <Label htmlFor="cp-newPassword">{t('newPassword')}</Label>
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
                  aria-label={showNew ? ta('hidePassword') : ta('showPassword')}
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
            {isPending ? t('changePassword.submitting') : t('changePassword.trigger')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
