'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { supplierCategoryResolver, supplierCategoryDefaultValues, type SupplierCategoryFormValues } from '@/schemas/supplier-category.schema'
import { createSupplierCategory, updateSupplierCategory } from '@/actions/supplier-category.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'

interface SupplierCategoryFormProps {
  id?: string
  defaultValues?: SupplierCategoryFormValues
}

export function SupplierCategoryForm({ id, defaultValues }: SupplierCategoryFormProps) {
  const isEditing = !!id
  const [serverError, setServerError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm<SupplierCategoryFormValues>({
    resolver: supplierCategoryResolver,
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
      if (!isEditing) router.push('/supplier-categories')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 max-w-lg">
      {serverError && <FieldError>{serverError}</FieldError>}

      <FieldGroup>
        <Controller
          name="name"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Name:</FieldLabel>
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
              <FieldLabel>Description:</FieldLabel>
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
                <FieldLabel htmlFor="isActive" className="cursor-pointer">Active category:</FieldLabel>
              </Field>
            )}
          />
        )}
      </FieldGroup>

      <Field orientation="horizontal">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : isEditing ? 'Save changes' : 'Create category'}
        </Button>
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          Reset
        </Button>
      </Field>
    </form>
  )
}
