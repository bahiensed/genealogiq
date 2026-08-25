'use client'

import { Controller, useWatch, type Control } from 'react-hook-form'
import { useTranslations, useLocale } from 'next-intl'
import type { PackageFormValues } from '@/schemas/package.schema'
import { Input } from '@genealogiq/ui/input'
import { Textarea } from '@genealogiq/ui/textarea'
import { Field, FieldError, FieldGroup, FieldLabel } from '@genealogiq/ui/field'
import { CurrencyInput } from '@/components/ui/currency-input'

// The four fields a product is made of, shared by the create dialog and the
// edit page so the two cannot drift. Everything that exists on only one of
// them — the active switch, the Stripe panel — stays with the edit form.
export function PackageFields({ control }: { control: Control<PackageFormValues> }) {
  const t      = useTranslations('Packages')
  const locale = useLocale()
  const usd    = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' })
  const noun   = t('noun.product')

  const quantity = useWatch({ control, name: 'quantity' }) || 0
  const price    = useWatch({ control, name: 'price' })    || 0

  return (
    <FieldGroup>
      <Controller
        name="name"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>{t('fields.name', { noun })}</FieldLabel>
            <Input {...field} maxLength={32} autoComplete="off" aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="quantity"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>{t('fields.quantity')}</FieldLabel>
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
              <FieldLabel>{t('fields.price')}</FieldLabel>
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

      {quantity > 0 && price > 0 && (
        <div className="rounded-lg border bg-muted/40 px-4 py-3 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('unitPrice')}</span>
          <span className="font-semibold tabular-nums">{usd.format(price / quantity)}</span>
        </div>
      )}

      <Controller
        name="description"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>{t('fields.description')}</FieldLabel>
            <Textarea {...field} value={field.value ?? ''} rows={3} maxLength={256} aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </FieldGroup>
  )
}
