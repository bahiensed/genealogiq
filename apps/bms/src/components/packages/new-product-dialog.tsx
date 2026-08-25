'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { getPackageSchema, packageDefaultValues, type PackageFormValues } from '@/schemas/package.schema'
import { createPackage } from '@/actions/package.actions'
import { PackageFields } from '@/components/packages/package-fields'
import { Button } from '@genealogiq/ui/button'
import { Field, FieldError } from '@genealogiq/ui/field'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@genealogiq/ui/dialog'

// Creating a product is four fields with no server-side prefill, so it does
// not need a route of its own — the list stays on screen behind it and
// refreshes in place. Editing keeps its page: it carries the Stripe panel and
// a record the URL should be able to point at.
export function NewProductDialog() {
  const t    = useTranslations('Packages')
  const tc   = useTranslations('Common')
  const tErr = useTranslations('Errors')
  const noun = t('noun.product')
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm<PackageFormValues>({
    resolver:      useMemo(() => zodResolver(getPackageSchema(tErr)), [tErr]),
    defaultValues: packageDefaultValues,
  })

  const { control, handleSubmit, reset, formState: { isSubmitting } } = form

  function close() {
    setOpen(false)
    reset(packageDefaultValues)
    setServerError(null)
  }

  async function onSubmit(data: PackageFormValues) {
    setServerError(null)
    const result = await createPackage(data)
    if (!result.ok) {
      setServerError(result.message)
      return
    }
    if (result.message) toast.success(result.message)
    close()
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogTrigger asChild>
        <Button>{t('newProduct')}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('new', { noun })}</DialogTitle>
          <DialogDescription>{t('newDialogDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <PackageFields control={control} />

          {serverError && <FieldError>{serverError}</FieldError>}

          <Field orientation="horizontal">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tc('creating') : t('createButton', { noun })}
            </Button>
            <Button type="button" variant="outline" onClick={close}>
              {tc('cancel')}
            </Button>
          </Field>
        </form>
      </DialogContent>
    </Dialog>
  )
}
