'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { createCustomerCategory } from '@/actions/customer-category.actions'
import { customerCategoryResolver, customerCategoryDefaultValues, type CustomerCategoryFormValues } from '@/schemas/customer-category.schema'
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

interface AddCustomerCategoryDialogProps {
  onCreated: (category: { id: string; name: string }) => void
}

export function AddCustomerCategoryDialog({ onCreated }: AddCustomerCategoryDialogProps) {
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<CustomerCategoryFormValues>({
    resolver: customerCategoryResolver,
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
          Adicionar nova categoria
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova categoria de cliente</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FieldGroup>
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Nome:</FieldLabel>
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
                  <FieldLabel>Descrição:</FieldLabel>
                  <Textarea {...field} rows={2} aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>

          {serverError && <FieldError>{serverError}</FieldError>}

          <Field orientation="horizontal">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Criando…' : 'Criar categoria'}
            </Button>
            <Button type="button" variant="outline" onClick={() => { setOpen(false); reset(); setServerError(null) }}>
              Cancelar
            </Button>
          </Field>
        </form>
      </DialogContent>
    </Dialog>
  )
}
