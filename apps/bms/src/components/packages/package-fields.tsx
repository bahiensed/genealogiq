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
function PriceField({
  control, name, label, symbol,
}: {
  control: Control<PackageFormValues>
  name:    'priceUsd' | 'priceBrl' | 'priceMxn'
  label:   string
  symbol:  string
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel>{label}</FieldLabel>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 select-none text-muted-foreground">
              {symbol}
            </span>
            <CurrencyInput
              className="pl-10"
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
  )
}

export function PackageFields({ control }: { control: Control<PackageFormValues> }) {
  const t      = useTranslations('Packages')
  const locale = useLocale()
  const usd    = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' })
  const noun   = t('noun.product')

  const quantity = useWatch({ control, name: 'quantity' }) || 0
  const priceUsd = useWatch({ control, name: 'priceUsd' }) || 0
  const priceBrl = useWatch({ control, name: 'priceBrl' }) || 0
  const priceMxn = useWatch({ control, name: 'priceMxn' }) || 0

  const priced = [
    { code: 'USD', value: priceUsd },
    { code: 'BRL', value: priceBrl },
    { code: 'MXN', value: priceMxn },
  ].filter((p) => p.value > 0)

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

      {/* One slot per currency. Leaving one at zero is a decision, not an
          omission: the product simply is not sold in that currency, and the
          interfaces using it will not offer it. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PriceField control={control} name="priceUsd" label="USD" symbol="$" />
        <PriceField control={control} name="priceBrl" label="BRL" symbol="R$" />
        <PriceField control={control} name="priceMxn" label="MXN" symbol="MX$" />
      </div>

      {quantity > 0 && priced.length > 0 && (
        <div className="rounded-lg border bg-muted/40 px-4 py-3 flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">{t('unitPrice')}</span>
          {priced.map((p) => (
            <div key={p.code} className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">{p.code}</span>
              <span className="font-semibold tabular-nums">
                {new Intl.NumberFormat(locale, { style: 'currency', currency: p.code }).format(p.value / quantity)}
              </span>
            </div>
          ))}
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
