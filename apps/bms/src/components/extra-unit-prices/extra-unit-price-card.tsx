'use client'

import { useState, useTransition } from 'react'
import { useForm, Controller, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { getExtraUnitPriceSchema, type ExtraUnitPriceFormValues } from '@/schemas/extra-unit-price.schema'
import { updateExtraUnitPrice, syncExtraUnitPriceWithStripe } from '@/actions/extra-unit-price.actions'
import type { ExtraUnitPriceRow } from '@/queries/extra-unit-prices'
import { Button } from '@genealogiq/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@genealogiq/ui/card'
import { Separator } from '@genealogiq/ui/separator'
import { Field, FieldError, FieldLabel } from '@genealogiq/ui/field'
import { CurrencyInput } from '@/components/ui/currency-input'

interface PriceInputProps {
  control: Control<ExtraUnitPriceFormValues>
  name:    'priceUsd' | 'priceBrl' | 'priceMxn'
  label:   string
  symbol:  string
}

function PriceInput({ control, name, label, symbol }: PriceInputProps) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel>{label}</FieldLabel>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 select-none text-muted-foreground">{symbol}</span>
            <CurrencyInput className="pl-8" value={field.value} onChange={field.onChange} autoComplete="off" aria-invalid={fieldState.invalid} />
          </div>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}

interface Props {
  row:   ExtraUnitPriceRow
  title: string
}

export function ExtraUnitPriceCard({ row, title }: Props) {
  const t  = useTranslations('ExtraUnitPrices')
  const tc = useTranslations('Common')
  const tErr = useTranslations('Errors')
  const [isSyncing, startSync] = useTransition()

  const form = useForm<ExtraUnitPriceFormValues>({
    resolver: zodResolver(getExtraUnitPriceSchema(tErr)),
    defaultValues: {
      priceUsd: row.priceUsd ?? 0,
      priceBrl: row.priceBrl ?? 0,
      priceMxn: row.priceMxn ?? 0,
    },
  })
  const { control, handleSubmit, formState: { isSubmitting } } = form

  const [serverError, setServerError] = useState<string | null>(null)

  async function onSubmit(data: ExtraUnitPriceFormValues) {
    setServerError(null)
    const result = await updateExtraUnitPrice(row.id, data)
    if (!result.ok) setServerError(result.message)
    else if (result.message) toast.success(result.message)
  }

  function handleSync() {
    startSync(async () => {
      const result = await syncExtraUnitPriceWithStripe(row.id)
      if (!result.ok) toast.error(result.message)
      else if (result.message) toast.success(result.message)
    })
  }

  const currencyStatus = [
    { code: 'USD', configured: row.priceUsd !== null && row.priceUsd > 0, synced: !!row.stripePriceIdUsd },
    { code: 'MXN', configured: row.priceMxn !== null && row.priceMxn > 0, synced: !!row.stripePriceIdMxn },
    { code: 'BRL', configured: row.priceBrl !== null && row.priceBrl > 0, synced: !!row.stripePriceIdBrl },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold tracking-tight">{title}</CardTitle>
      </CardHeader>
      <Separator />
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <PriceInput control={control} name="priceUsd" label="USD" symbol="$" />
            <PriceInput control={control} name="priceMxn" label="MXN" symbol="MX$" />
            <PriceInput control={control} name="priceBrl" label="BRL" symbol="R$" />
          </div>

          <div className="rounded-lg border bg-muted/30 px-4 py-3 flex flex-col gap-3 text-xs">
            <span className="text-muted-foreground uppercase tracking-wider">{t('stripe.title')}</span>
            <div className="flex flex-col gap-1">
              {currencyStatus.map((c) => (
                <div key={c.code} className="flex items-center justify-between">
                  <span className="font-mono">{c.code}</span>
                  {!c.configured ? (
                    <span className="text-muted-foreground">{t('stripe.notConfigured')}</span>
                  ) : c.synced ? (
                    <span className="font-medium text-emerald-600">{t('stripe.synced')}</span>
                  ) : (
                    <span className="font-medium text-amber-600">{t('stripe.notSynced')}</span>
                  )}
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" className="self-start" disabled={isSyncing} onClick={handleSync}>
              {isSyncing ? t('stripe.syncing') : t('stripe.syncButton')}
            </Button>
          </div>

          {serverError && <FieldError>{serverError}</FieldError>}
          <Field orientation="horizontal">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tc('saving') : tc('save')}
            </Button>
          </Field>
        </form>
      </CardContent>
    </Card>
  )
}
