'use client'

import { useState, useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { requestEmailChange } from '@/actions/auth'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'

export function ChangeEmailDialog() {
  const t = useTranslations('Auth')
  const [open, setOpen] = useState(false)
  const [state, dispatch, isPending] = useActionState(requestEmailChange, undefined)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-sm text-foreground underline underline-offset-4 hover:no-underline cursor-pointer">
          {t('changeEmailTrigger')}
        </button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('changeEmailTitle')}</DialogTitle>
          <DialogDescription>
            {t('changeEmailDescription')}
          </DialogDescription>
        </DialogHeader>

        <form action={dispatch} className="flex flex-col gap-4">
          {state && !state.ok && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}
          {state?.ok && state.message && (
            <p className="text-sm text-green-600">{state.message}</p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ce-newEmail">{t('newEmailLabel')}</Label>
            <Input
              id="ce-newEmail"
              name="newEmail"
              type="email"
              placeholder={t('newEmailPlaceholder')}
              autoComplete="email"
              aria-invalid={!!state?.fieldErrors?.newEmail}
            />
            {state?.fieldErrors?.newEmail?.[0] && (
              <p className="text-xs text-destructive">{state.fieldErrors.newEmail[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ce-currentPassword">{t('currentPasswordLabel')}</Label>
            <InputGroup aria-invalid={!!state?.fieldErrors?.currentPassword}>
              <InputGroupInput
                id="ce-currentPassword"
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

          <Button type="submit" className="w-full mt-2" disabled={isPending}>
            {isPending ? t('changing') : t('changeEmailSubmit')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
