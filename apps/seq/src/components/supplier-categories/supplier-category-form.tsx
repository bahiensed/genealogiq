'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { getSupplierCategorySchema, supplierCategoryDefaultValues, type SupplierCategoryFormValues } from '@/schemas/supplier-category.schema'
import { createSupplierCategory, updateSupplierCategory } from '@/actions/supplier-category.actions'
import { Button } from '@genealogiq/ui/button'
import { Input } from '@genealogiq/ui/input'
import { Textarea } from '@genealogiq/ui/textarea'
import { Switch } from '@genealogiq/ui/switch'
import { Field, FieldError, FieldGroup, FieldLabel } from '@genealogiq/ui/field'

interface SupplierCategoryFormProps {
  id?: string
  defaultValues?: SupplierCategoryFormValues
}

export function SupplierCategoryForm({ id, defaultValues }: SupplierCategoryFormProps) {
  const t    = useTranslations('SupplierCategories')
  const tc   = useTranslations('Common')
  const tErr = useTranslations('Errors')
  const isEditing = !!id
  const [serverError, setServerError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm<SupplierCategoryFormValues>({
    resolver: useMemo(() => zodResolver(getSupplierCategorySchema(tErr)) as any, [tErr]), // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultValues: defaultValues ?? supplierCategoryDefaultValues,
  })

  const { control, handleSubmit, formState: { isSubmitting } } = form

  async function onSubmit(data: SupplierCategoryFormValues) {
    setServerError(null)
    const result = isEditing
      ? await updateSupplierCategory(id, data)
      : await createSupplierCategory(data)
    if ('error' in result) {
      setServerError(result.error)
    } else {
      toast.success(result.success)
      if (!isEditing) router.push('/categories/suppliers')
    }
  }

  function scrollToFirstError() {
    requestAnimationFrame(() => {
      document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, scrollToFirstError)} className="flex flex-col gap-6 max-w-lg">

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
              <Textarea {...field} rows={3} aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {isEditing && (
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <Field orientation="horizontal">
                <Switch
                  id="isActive"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                <FieldLabel htmlFor="isActive" className="cursor-pointer">{t('fields.isActive')}</FieldLabel>
              </Field>
            )}
          />
        )}
      </FieldGroup>

      {serverError && <FieldError>{serverError}</FieldError>}

      <Field orientation="horizontal">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? (isEditing ? tc('saving') : tc('creating'))
            : isEditing ? t('save') : t('create')}
        </Button>
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          {tc('reset')}
        </Button>
      </Field>
    </form>
  )
}
