'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { customerCategoryResolver, customerCategoryDefaultValues, type CustomerCategoryFormValues } from '@/schemas/customer-category.schema'
import { createCustomerCategory, updateCustomerCategory } from '@/actions/customer-category.actions'
import { Button } from '@genealogiq/ui/button'
import { Input } from '@genealogiq/ui/input'
import { Textarea } from '@genealogiq/ui/textarea'
import { Switch } from '@genealogiq/ui/switch'
import { Field, FieldError, FieldGroup, FieldLabel } from '@genealogiq/ui/field'

interface CustomerCategoryFormProps {
  id?: string
  defaultValues?: CustomerCategoryFormValues
}

export function CustomerCategoryForm({ id, defaultValues }: CustomerCategoryFormProps) {
  const t  = useTranslations('CustomerCategories')
  const tc = useTranslations('Common')
  const isEditing = !!id
  const [serverError, setServerError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm<CustomerCategoryFormValues>({
    resolver: customerCategoryResolver,
    defaultValues: defaultValues ?? customerCategoryDefaultValues,
  })

  const { control, handleSubmit, formState: { isSubmitting } } = form

  async function onSubmit(data: CustomerCategoryFormValues) {
    setServerError(null)
    const result = isEditing
      ? await updateCustomerCategory(id, data)
      : await createCustomerCategory(data)
    if ('error' in result) {
      setServerError(result.error)
    } else {
      toast.success('success' in result ? result.success : t('toasts.created'))
      if (!isEditing) router.push('/categories/customers')
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
          {isSubmitting ? tc('saving') : isEditing ? tc('save') : t('create')}
        </Button>
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          {tc('reset')}
        </Button>
      </Field>
    </form>
  )
}
