'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { packageResolver, packageDefaultValues, type PackageFormValues } from '@/schemas/package.schema'
import { createPackage, updatePackage } from '@/actions/package.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { CurrencyInput } from '@/components/ui/currency-input'

interface PackageFormProps {
  id?: string
  defaultValues?: PackageFormValues
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function PackageForm({ id, defaultValues }: PackageFormProps) {
  const isEditing = !!id
  const [serverError, setServerError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm<PackageFormValues>({
    resolver: packageResolver,
    defaultValues: defaultValues ?? packageDefaultValues,
  })

  const { control, handleSubmit, watch, formState: { isSubmitting } } = form

  const quantity = watch('quantity') || 0
  const price    = watch('price') || 0

  async function onSubmit(data: PackageFormValues) {
    setServerError(null)
    const result = isEditing
      ? await updatePackage(id, data)
      : await createPackage(data)
    if ('error' in result) {
      setServerError(result.error)
    } else {
      toast.success(result.success)
      if (!isEditing) router.push('/packages')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8 max-w-lg">
      <div className="flex items-center justify-between">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          {isEditing ? 'Edit package' : 'New package'}
        </h1>
        {isEditing && (
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Switch id="isActive" checked={field.value} onCheckedChange={field.onChange} />
                <label htmlFor="isActive" className="text-sm cursor-pointer">Active?</label>
              </div>
            )}
          />
        )}
      </div>

      <FieldGroup>
        {/* Name — full width */}
        <Controller
          name="name"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Package Name:</FieldLabel>
              <Input {...field} autoComplete="off" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Quantity + Price — side by side */}
        <div className="grid grid-cols-2 gap-4">
          <Controller
            name="quantity"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>QR-Code Qty.:</FieldLabel>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  {...field}
                  value={field.value === 0 || Number.isNaN(field.value) ? '' : field.value}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  autoComplete="off"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="price"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Price (US$):</FieldLabel>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 select-none text-muted-foreground">$</span>
                  <CurrencyInput
                    className="pl-7"
                    value={field.value}
                    onChange={field.onChange}
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                  />
                </div>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        {/* Summary pill */}
        {quantity > 0 && price > 0 && (
          <div className="rounded-lg border bg-muted/40 px-4 py-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Unit price per QR code</span>
            <span className="font-semibold tabular-nums">{usd.format(price / quantity)}</span>
          </div>
        )}

        {/* Description — full width */}
        <Controller
          name="description"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Description:</FieldLabel>
              <Textarea {...field} value={field.value ?? ''} rows={3} aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      {serverError && <FieldError>{serverError}</FieldError>}
      <Field orientation="horizontal">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : isEditing ? 'Save changes' : 'Create package'}
        </Button>
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          Reset
        </Button>
      </Field>
    </form>
  )
}
