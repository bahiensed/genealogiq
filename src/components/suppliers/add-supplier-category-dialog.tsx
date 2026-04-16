'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { createSupplierCategory } from '@/actions/supplier-category.actions'
import { supplierCategoryResolver, supplierCategoryDefaultValues, type SupplierCategoryFormValues } from '@/schemas/supplier-category.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface AddSupplierCategoryDialogProps {
  onCreated: (category: { id: string; name: string }) => void
}

export function AddSupplierCategoryDialog({ onCreated }: AddSupplierCategoryDialogProps) {
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<SupplierCategoryFormValues>({
    resolver: supplierCategoryResolver,
    defaultValues: supplierCategoryDefaultValues,
  })

  const { control, handleSubmit, reset, formState: { isSubmitting } } = form

  async function onSubmit(data: SupplierCategoryFormValues) {
    setServerError(null)
    const result = await createSupplierCategory(data)
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
          Add new category
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New supplier category</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
                  <Textarea {...field} rows={2} aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>

          {serverError && <FieldError>{serverError}</FieldError>}

          <Field orientation="horizontal">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create category'}
            </Button>
            <Button type="button" variant="outline" onClick={() => { setOpen(false); reset(); setServerError(null) }}>
              Cancel
            </Button>
          </Field>
        </form>
      </DialogContent>
    </Dialog>
  )
}
