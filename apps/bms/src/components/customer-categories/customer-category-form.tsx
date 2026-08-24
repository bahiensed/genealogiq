'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { getCustomerCategorySchema, customerCategoryDefaultValues, type CustomerCategoryFormValues } from '@/schemas/customer-category.schema'
import { createCustomerCategory, updateCustomerCategory } from '@/actions/customer-category.actions'
import { Button } from '@genealogiq/ui/button'
import { Input } from '@genealogiq/ui/input'
import { Textarea } from '@genealogiq/ui/textarea'
import { Switch } from '@genealogiq/ui/switch'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@genealogiq/ui/card'
import { Separator } from '@genealogiq/ui/separator'
import { Field, FieldError, FieldGroup, FieldLabel } from '@genealogiq/ui/field'

interface CustomerCategoryFormProps {
  id?: string
  defaultValues?: CustomerCategoryFormValues
}

export function CustomerCategoryForm({ id, defaultValues }: CustomerCategoryFormProps) {
  const t    = useTranslations('CustomerCategories')
  const tc   = useTranslations('Common')
  const tErr = useTranslations('Errors')
  const isEditing = !!id
  const [serverError, setServerError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm<CustomerCategoryFormValues>({
    resolver: useMemo(() => zodResolver(getCustomerCategorySchema(tErr)), [tErr]),
    defaultValues: defaultValues ?? customerCategoryDefaultValues,
  })

  const { control, handleSubmit, formState: { isSubmitting } } = form

  async function onSubmit(data: CustomerCategoryFormValues) {
    setServerError(null)
    const result = isEditing
      ? await updateCustomerCategory(id, data)
      : await createCustomerCategory(data)
    if (!result.ok) {
      setServerError(result.message)
    } else {
      if (result.message) toast.success(result.message)
      if (!isEditing) router.push('/categories/customers')
    }
  }

  return (
      <Card>
        <CardHeader>
          <CardTitle className="scroll-m-20 text-2xl font-bold tracking-tight">
            {isEditing ? t('editPage') : t('newPage')}
          </CardTitle>
          {isEditing && (
            <CardAction>
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Switch id="isActive" checked={field.value} onCheckedChange={field.onChange} />
                    <label htmlFor="isActive" className="text-sm cursor-pointer">
                      {field.value ? t('status.active') : t('status.inactive')}
                    </label>
                  </div>
                )}
              />
            </CardAction>
          )}
        </CardHeader>
        <Separator />
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
            {serverError && <FieldError>{serverError}</FieldError>}

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
            </FieldGroup>

            <Field orientation="horizontal">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? tc('saving') : isEditing ? t('saveChanges') : t('create')}
              </Button>
              <Button type="button" variant="outline" onClick={() => form.reset()}>
                {tc('reset')}
              </Button>
            </Field>
          </form>
        </CardContent>
      </Card>
  )
}
