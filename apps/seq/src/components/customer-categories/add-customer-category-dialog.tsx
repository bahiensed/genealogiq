'use client'

import { useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { createCustomerCategory } from '@/actions/customer-category.actions'
import { getCustomerCategorySchema, customerCategoryDefaultValues, type CustomerCategoryFormValues } from '@/schemas/customer-category.schema'
import { Button } from '@genealogiq/ui/button'
import { Input } from '@genealogiq/ui/input'
import { Textarea } from '@genealogiq/ui/textarea'
import { Field, FieldError, FieldGroup, FieldLabel } from '@genealogiq/ui/field'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@genealogiq/ui/dialog'

interface AddCustomerCategoryDialogProps {
  onCreated: (category: { id: string; name: string }) => void
}

export function AddCustomerCategoryDialog({ onCreated }: AddCustomerCategoryDialogProps) {
  const t   = useTranslations('CustomerCategories')
  const tc  = useTranslations('Common')
  const tErr = useTranslations('Errors')
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<CustomerCategoryFormValues>({
    resolver: useMemo(() => zodResolver(getCustomerCategorySchema(tErr)) as any, [tErr]), // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultValues: customerCategoryDefaultValues,
  })

  const { control, handleSubmit, reset, formState: { isSubmitting } } = form

  async function onSubmit(data: CustomerCategoryFormValues) {
    setServerError(null)
    const result = await createCustomerCategory(data)
    if ('error' in result) {
      setServerError(result.error)
    } else {
      onCreated(result.category)
      setOpen(false)
      reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { reset(); setServerError(null) } }}>
      <DialogTrigger asChild>
        <button type="button" className="text-sm text-primary underline-offset-4 hover:underline">
          {t('dialog.addNew')}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('dialog.title')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FieldGroup>
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>{t('fields.name')}</FieldLabel>
                  <Input {...field} autoComplete="off" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="description"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>{t('fields.description')}</FieldLabel>
                  <Textarea {...field} rows={2} aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>

          {serverError && <FieldError>{serverError}</FieldError>}

          <Field orientation="horizontal">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tc('creating') : t('create')}
            </Button>
            <Button type="button" variant="outline" onClick={() => { setOpen(false); reset(); setServerError(null) }}>
              {tc('cancel')}
            </Button>
          </Field>
        </form>
      </DialogContent>
    </Dialog>
  )
}
