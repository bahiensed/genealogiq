'use client'

import { Controller, useWatch, type Control } from 'react-hook-form'
import { useTranslations } from 'next-intl'
import { CURRENCY_CODE_ORDER } from '@genealogiq/core'
import type { PartnerPlanFormValues } from '@/schemas/partner-plan.schema'
import { Input } from '@genealogiq/ui/input'
import { Textarea } from '@genealogiq/ui/textarea'
import { Field, FieldError, FieldGroup, FieldLabel } from '@genealogiq/ui/field'
import { CurrencyInput } from '@/components/ui/currency-input'

/**
 * Everything a plan is made of, split into the two things it actually is: the
 * commercial terms, and the price book.
 *
 * The terms are all editable because that is the founder's one hard constraint
 * on this model — percentages, deadlines, allowances and trial length must move
 * without a deploy. Leaving any of them as a constant would put the CTO in the
 * loop for a pricing decision.
 */

type MoneyName =
  | 'cashUsd' | 'installmentUsd' | 'unitRefUsd'
  | 'cashBrl' | 'installmentBrl' | 'unitRefBrl'
  | 'cashMxn' | 'installmentMxn' | 'unitRefMxn'

type NumberName =
  | 'annualAllowance' | 'rolloverRate' | 'rolloverValidityMonths' | 'graceDays'
  | 'committedReservationMonths' | 'activationTrialMonths' | 'installmentCount'

const SYMBOL: Record<string, string> = { USD: '$', BRL: 'R$', MXN: 'MX$' }

function MoneyField({
  control, name, label, symbol,
}: {
  control: Control<PartnerPlanFormValues>
  name: MoneyName
  label: string
  symbol: string
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
              className="pl-12"
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

function NumberField({
  control, name, label, hint, step,
}: {
  control: Control<PartnerPlanFormValues>
  name: NumberName
  label: string
  hint?: string
  step?: string
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel>{label}</FieldLabel>
          <Input
            type="number"
            step={step ?? '1'}
            value={field.value}
            onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
            autoComplete="off"
            aria-invalid={fieldState.invalid}
          />
          {hint && !fieldState.invalid && <p className="text-xs text-muted-foreground">{hint}</p>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}

export function PartnerPlanFields({ control }: { control: Control<PartnerPlanFormValues> }) {
  const t = useTranslations('PartnerPlans')

  const allowance   = useWatch({ control, name: 'annualAllowance' })
  const instalments = useWatch({ control, name: 'installmentCount' })

  return (
    <FieldGroup className="gap-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          name="name"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>{t('form.name')}</FieldLabel>
              <Input {...field} autoComplete="off" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="code"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>{t('form.code')}</FieldLabel>
              <Input
                {...field}
                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                autoComplete="off"
                aria-invalid={fieldState.invalid}
                className="font-mono"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>

      <Controller
        name="description"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>{t('form.description')}</FieldLabel>
            <Textarea {...field} rows={2} aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t('form.termsSection')}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NumberField control={control} name="annualAllowance" label={t('form.annualAllowance')} />
          <NumberField
            control={control}
            name="rolloverRate"
            step="0.01"
            label={t('form.rolloverRate')}
            hint={t('form.rolloverRateHint')}
          />
          <NumberField
            control={control}
            name="rolloverValidityMonths"
            label={t('form.rolloverValidity')}
            hint={t('form.rolloverValidityHint')}
          />
          <NumberField
            control={control}
            name="graceDays"
            label={t('form.graceDays')}
            hint={t('form.graceDaysHint')}
          />
          <NumberField
            control={control}
            name="committedReservationMonths"
            label={t('form.committedMonths')}
            hint={t('form.committedMonthsHint')}
          />
          <NumberField
            control={control}
            name="activationTrialMonths"
            label={t('form.trialMonths')}
            hint={t('form.trialMonthsHint')}
          />
          <Controller
            name="activationTrialPlanCode"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>{t('form.trialPlanCode')}</FieldLabel>
                <Input
                  {...field}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  autoComplete="off"
                  aria-invalid={fieldState.invalid}
                  className="font-mono"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t('form.priceSection')}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">{t('form.priceHint')}</p>
        </div>

        <NumberField
          control={control}
          name="installmentCount"
          label={t('form.installmentCount')}
          hint={t('form.installmentCountHint')}
        />

        {/* Same order as the language switcher — see CURRENCY_DISPLAY_ORDER. */}
        {CURRENCY_CODE_ORDER.map((code: string) => {
          const suffix = code === 'USD' ? 'Usd' : code === 'BRL' ? 'Brl' : 'Mxn'
          return (
            <div key={code} className="grid gap-4 sm:grid-cols-3">
              <MoneyField
                control={control}
                name={`cash${suffix}` as MoneyName}
                label={t('form.cash', { currency: code })}
                symbol={SYMBOL[code]}
              />
              <MoneyField
                control={control}
                name={`installment${suffix}` as MoneyName}
                label={t('form.installment', { currency: code, count: instalments || 0 })}
                symbol={SYMBOL[code]}
              />
              <MoneyField
                control={control}
                name={`unitRef${suffix}` as MoneyName}
                label={t('form.unitRef', { currency: code, allowance: allowance || 0 })}
                symbol={SYMBOL[code]}
              />
            </div>
          )
        })}
      </section>
    </FieldGroup>
  )
}
