'use client'

import { useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { createSupplierCategory } from '@/actions/supplier-category.actions'
import { getSupplierCategorySchema, supplierCategoryDefaultValues, type SupplierCategoryFormValues } from '@/schemas/supplier-category.schema'
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

interface AddSupplierCategoryDialogProps {
  onCreated: (category: { id: string; name: string }) => void
}

export function AddSupplierCategoryDialog({ onCreated }: AddSupplierCategoryDialogProps) {
  const t  = useTranslations('Suppliers')
  const tc = useTranslations('Common')
  const tErr = useTranslations('Errors')
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<SupplierCategoryFormValues>({
    resolver: useMemo(() => zodResolver(getSupplierCategorySchema(tErr)) as any, [tErr]),  // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultValues: supplierCategoryDefaultValues,
  })

  const { control, handleSubmit, reset, formState: { isSubmitting } } = form

  async function onSubmit(data: SupplierCategoryFormValues) {
    setServerError(null)
    const result = await createSupplierCategory(data)
    if (!result.ok) {
      setServerError(result.message)
    } else {
      onCreated(result.data!.category)
      setOpen(false)
      reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { reset(); setServerError(null) } }}>
      <DialogTrigger asChild>
        <button type="button" className="text-sm text-primary underline-offset-4 hover:underline">
          {t('category.add')}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('category.title')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FieldGroup>
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>{t('category.name')}</FieldLabel>
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
                  <FieldLabel>{t('category.description')}</FieldLabel>
                  <Textarea {...field} rows={2} aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>

          {serverError && <FieldError>{serverError}</FieldError>}

          <Field orientation="horizontal">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tc('creating') : t('category.create')}
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
