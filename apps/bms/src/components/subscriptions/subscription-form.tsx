'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { getSubscriptionSchema, subscriptionDefaultValues, type SubscriptionFormValues } from '@/schemas/subscription.schema'
import { createSubscription, updateSubscription, syncSubscriptionWithStripe } from '@/actions/subscription.actions'
import { Button } from '@genealogiq/ui/button'
import { Input } from '@genealogiq/ui/input'
import { Textarea } from '@genealogiq/ui/textarea'
import { Switch } from '@genealogiq/ui/switch'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@genealogiq/ui/card'
import { Separator } from '@genealogiq/ui/separator'
import { Field, FieldError, FieldLabel } from '@genealogiq/ui/field'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { CurrencyInput } from '@/components/ui/currency-input'

interface SubscriptionFormProps {
  id?: string
  defaultValues?: SubscriptionFormValues
  stripeProductId?: string | null
  stripeAnnualPriceIdUsd?: string | null
  stripeMonthlyPriceIdUsd?: string | null
  stripeAnnualPriceIdBrl?: string | null
  stripeMonthlyPriceIdBrl?: string | null
  stripeAnnualPriceIdMxn?: string | null
  stripeMonthlyPriceIdMxn?: string | null
}

interface IntFieldProps {
  control: Control<SubscriptionFormValues>
  name: keyof SubscriptionFormValues
  label: string
  min?: number
  helper?: string
  className?: string
}

function IntField({ control, name, label, min = 0, helper, className }: IntFieldProps) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
          <FieldLabel>{label}</FieldLabel>
          <Input
            type="number"
            step="1"
            min={min}
            value={typeof field.value === 'number' && !Number.isNaN(field.value) ? field.value : ''}
            onChange={(e) => field.onChange(e.target.valueAsNumber)}
            onBlur={field.onBlur}
            name={field.name}
            ref={field.ref}
            autoComplete="off"
            aria-invalid={fieldState.invalid}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
        </Field>
      )}
    />
  )
}

interface PriceBlockProps {
  control:      Control<SubscriptionFormValues>
  currencyCode: string
  symbol:       string
  annualName:   'priceUsd' | 'priceBrl' | 'priceMxn'
  monthlyName:  'monthlyPriceUsd' | 'monthlyPriceBrl' | 'monthlyPriceMxn'
  annualLabel:  string
  monthlyLabel: string
  hint:         string
}

function PriceInput({ control, name, label, symbol }: {
  control: Control<SubscriptionFormValues>
  name:    'priceUsd' | 'priceBrl' | 'priceMxn' | 'monthlyPriceUsd' | 'monthlyPriceBrl' | 'monthlyPriceMxn'
  label:   string
  symbol:  string
}) {
  const symbolPadding = symbol.length > 2 ? 'pl-12' : symbol.length > 1 ? 'pl-10' : 'pl-8'
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel>{label}</FieldLabel>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 select-none text-muted-foreground">{symbol}</span>
            {/* A fixed pl-8 fits "$" but not "MX$", which collided with the amount.
                Scale the padding with the symbol so every currency clears it. */}
            <CurrencyInput
              className={symbolPadding}
              value={typeof field.value === 'number' ? field.value : 0}
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

function PriceBlock({ control, currencyCode, symbol, annualName, monthlyName, annualLabel, monthlyLabel, hint }: PriceBlockProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{currencyCode}</span>
      <div className="grid grid-cols-2 gap-4">
        <PriceInput control={control} name={monthlyName} label={monthlyLabel} symbol={symbol} />
        <PriceInput control={control} name={annualName} label={annualLabel} symbol={symbol} />
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

export function SubscriptionForm({
  id, defaultValues,
  stripeAnnualPriceIdUsd, stripeMonthlyPriceIdUsd,
  stripeAnnualPriceIdBrl, stripeMonthlyPriceIdBrl,
  stripeAnnualPriceIdMxn, stripeMonthlyPriceIdMxn,
}: SubscriptionFormProps) {
  const t  = useTranslations('Subscriptions')
  const tc = useTranslations('Common')
  const tErr = useTranslations('Errors')
  const isEditing = !!id
  const [serverError, setServerError] = useState<string | null>(null)
  const [syncOpen, setSyncOpen] = useState(false)
  const [isSyncing, startSync] = useTransition()
  const router = useRouter()

  function handleSync() {
    if (!id) return
    startSync(async () => {
      const result = await syncSubscriptionWithStripe(id)
      if (!result.ok) {
        toast.error(result.message)
      } else {
        if (result.message) toast.success(result.message)
        router.refresh()
      }
    })
  }

  const form = useForm<SubscriptionFormValues>({
    resolver: useMemo(() => zodResolver(getSubscriptionSchema(tErr)), [tErr]),
    defaultValues: defaultValues ?? subscriptionDefaultValues,
  })

  const { control, handleSubmit, formState: { isSubmitting } } = form
  const isFreePlan = defaultValues?.code === 'FREE'

  // Each currency is independently configured (price > 0) and independently
  // synced (both its Stripe Price ids exist) — a plan can be partially
  // synced (USD live, BRL/MXN not set up yet) without that being an error.
  const currencyStatus = [
    { code: 'USD', configured: (defaultValues?.priceUsd ?? 0) > 0, synced: !!stripeAnnualPriceIdUsd && !!stripeMonthlyPriceIdUsd },
    { code: 'BRL', configured: (defaultValues?.priceBrl ?? 0) > 0, synced: !!stripeAnnualPriceIdBrl && !!stripeMonthlyPriceIdBrl },
    { code: 'MXN', configured: (defaultValues?.priceMxn ?? 0) > 0, synced: !!stripeAnnualPriceIdMxn && !!stripeMonthlyPriceIdMxn },
  ]

  async function onSubmit(data: SubscriptionFormValues) {
    setServerError(null)
    const result = isEditing
      ? await updateSubscription(id, data)
      : await createSubscription(data)
    if (!result.ok) {
      setServerError(result.message)
    } else {
      if (result.message) toast.success(result.message)
      if (!isEditing) router.push('/subscriptions')
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="scroll-m-20 text-2xl font-bold tracking-tight">
            {isEditing ? t('edit') : t('new')}
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <Controller
                name="code"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="lg:col-span-3">
                    <FieldLabel>{t('fields.code')}</FieldLabel>
                    <Input
                      {...field}
                      autoComplete="off"
                      aria-invalid={fieldState.invalid}
                      disabled={isFreePlan}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      placeholder={t('placeholders.code')}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    <p className="text-xs text-muted-foreground">
                      {isFreePlan ? t('hints.freeCodeReserved') : t('hints.code')}
                    </p>
                  </Field>
                )}
              />
              <Controller
                name="name"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="lg:col-span-6">
                    <FieldLabel>{t('fields.name')}</FieldLabel>
                    <Input {...field} autoComplete="off" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <IntField
                control={control}
                name="termLength"
                label={t('fields.termLength')}
                helper={t('hints.termLength')}
                className="lg:col-span-3"
              />
            </div>

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

            <div className="rounded-lg border bg-muted/30 px-4 py-3 flex flex-col gap-4">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{t('prices.title')}</span>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <PriceBlock
                  control={control} currencyCode="USD" symbol="$"
                  annualName="priceUsd" monthlyName="monthlyPriceUsd"
                  annualLabel={t('fields.annual')} monthlyLabel={t('fields.monthly')}
                  hint={t('hints.priceUsd')}
                />
                <PriceBlock
                  control={control} currencyCode="MXN" symbol="MX$"
                  annualName="priceMxn" monthlyName="monthlyPriceMxn"
                  annualLabel={t('fields.annual')} monthlyLabel={t('fields.monthly')}
                  hint={t('hints.priceMxn')}
                />
                <PriceBlock
                  control={control} currencyCode="BRL" symbol="R$"
                  annualName="priceBrl" monthlyName="monthlyPriceBrl"
                  annualLabel={t('fields.annual')} monthlyLabel={t('fields.monthly')}
                  hint={t('hints.priceBrl')}
                />
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 px-4 py-3 flex flex-col gap-4">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{t('quotas.title')}</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <IntField control={control} name="treeMaxMembers" label={t('fields.treeMaxMembers')} helper={t('hints.treeMaxMembers')} />
                <IntField control={control} name="bioMaxChars"    label={t('fields.bioMaxChars')}    helper={t('hints.bioMaxChars')} />
                <IntField control={control} name="documentsMax"   label={t('fields.documentsMax')} />

                <IntField control={control} name="mediaMaxImages" label={t('fields.mediaMaxImages')} helper={t('hints.mediaMaxImages')} />
                <IntField control={control} name="mediaMaxVideos" label={t('fields.mediaMaxVideos')} helper={t('hints.mediaMaxVideos')} />
                <IntField control={control} name="qrCodeMax"      label={t('fields.qrCodeMax')}      helper={t('hints.qrCodeMax')} />

                <IntField control={control} name="geoPlacesMax"   label={t('fields.geoPlacesMax')}   helper={t('hints.geoPlacesMax')} />
                <IntField control={control} name="memorialsMax"   label={t('fields.memorialsMax')} />
                <IntField control={control} name="petsMax"        label={t('fields.petsMax')} />
              </div>
            </div>

            {isEditing && (
              <div className="rounded-lg border bg-muted/30 px-4 py-3 flex flex-col gap-3 text-xs">
                <span className="text-muted-foreground uppercase tracking-wider">{t('stripe.title')}</span>
                <div className="flex flex-col gap-2">
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
                <p className="text-muted-foreground">
                  {t('stripe.hint')}
                </p>
                <AlertDialog open={syncOpen} onOpenChange={setSyncOpen}>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="self-start" disabled={isSyncing}>
                      {isSyncing ? t('stripe.syncing') : t('stripe.syncButton')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('stripe.confirmTitle')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('stripe.confirmDescription')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isSyncing}>{tc('cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSync} disabled={isSyncing}>{t('stripe.syncNow')}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

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
        </CardContent>
      </Card>
    </>
  )
}
