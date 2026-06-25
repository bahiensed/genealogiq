'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations, useLocale } from 'next-intl'
import { toast } from 'sonner'
import { getPackageSchema, packageDefaultValues, type PackageFormValues } from '@/schemas/package.schema'
import { createPackage, updatePackage, syncPackageWithStripe } from '@/actions/package.actions'
import { Button } from '@genealogiq/ui/button'
import { Input } from '@genealogiq/ui/input'
import { Textarea } from '@genealogiq/ui/textarea'
import { Switch } from '@genealogiq/ui/switch'
import { Badge } from '@genealogiq/ui/badge'
import { Field, FieldError, FieldGroup, FieldLabel } from '@genealogiq/ui/field'
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

interface PackageFormProps {
  id?:              string
  defaultValues?:   PackageFormValues
  stripeProductId?: string | null
  stripePriceId?:   string | null
  /** When provided the type field is hidden and this value is injected automatically. */
  fixedType?:       'DIGITAL' | 'PHYSICAL'
  /** Where to navigate after creating a new package. Defaults to '/packages'. */
  backHref?:        string
}

export function PackageForm({ id, defaultValues, stripeProductId, stripePriceId, fixedType, backHref = '/packages' }: PackageFormProps) {
  const t    = useTranslations('Packages')
  const tc   = useTranslations('Common')
  const tErr = useTranslations('Errors')
  const locale = useLocale()
  const usd = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' })
  const isEditing  = !!id
  const isSynced   = isEditing && !!stripePriceId
  const isPhysical = fixedType === 'PHYSICAL'
  const noun       = isPhysical ? t('noun.product') : t('noun.package')
  const [serverError, setServerError] = useState<string | null>(null)
  const [syncOpen, setSyncOpen]       = useState(false)
  const [isSyncing, startSync]        = useTransition()
  const router = useRouter()

  function handleSync() {
    if (!id) return
    startSync(async () => {
      const result = await syncPackageWithStripe(id)
      if (!result.ok) {
        toast.error(result.message)
      } else {
        if (result.message) toast.success(result.message)
        router.refresh()
      }
    })
  }

  const resolvedDefaults: PackageFormValues = defaultValues
    ? { ...defaultValues, ...(fixedType ? { type: fixedType } : {}) }
    : { ...packageDefaultValues, ...(fixedType ? { type: fixedType } : {}) }

  const form = useForm<PackageFormValues>({
    resolver: useMemo(() => zodResolver(getPackageSchema(tErr)) as any, [tErr]),  // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultValues: resolvedDefaults,
  })

  const { control, handleSubmit, watch, formState: { isSubmitting } } = form

  const quantity = watch('quantity') || 0
  const price    = watch('price') || 0

  async function onSubmit(data: PackageFormValues) {
    setServerError(null)
    const payload = fixedType ? { ...data, type: fixedType } : data
    const result = isEditing
      ? await updatePackage(id, payload)
      : await createPackage(payload)
    if (!result.ok) {
      setServerError(result.message)
    } else {
      if (result.message) toast.success(result.message)
      if (!isEditing) router.push(backHref)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8 max-w-lg">
      <div className="flex items-center justify-between">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          {isEditing ? t('edit', { noun }) : t('new', { noun })}
        </h1>
        <div className="flex items-center gap-3">
          {fixedType && (
            <Badge variant={fixedType === 'PHYSICAL' ? 'outline' : 'secondary'} className="text-xs">
              {fixedType === 'DIGITAL' ? t('typeBadge.digital') : t('typeBadge.physical')}
            </Badge>
          )}
          {isEditing && (
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Switch id="isActive" checked={field.value} onCheckedChange={field.onChange} />
                  <label htmlFor="isActive" className="text-sm cursor-pointer">{t('active')}</label>
                </div>
              )}
            />
          )}
        </div>
      </div>

      <FieldGroup>
        {/* Name — full width */}
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

        {/* Quantity + Price — side by side */}
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

        {/* Summary pill */}
        {quantity > 0 && price > 0 && (
          <div className="rounded-lg border bg-muted/40 px-4 py-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('unitPrice')}</span>
            <span className="font-semibold tabular-nums">{usd.format(price / quantity)}</span>
          </div>
        )}

        {/* Description — full width */}
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

        {isEditing && (
          <div className="rounded-lg border bg-muted/30 px-4 py-3 flex flex-col gap-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground uppercase tracking-wider">{t('stripe.title')}</span>
              {isSynced
                ? <span className="font-medium text-emerald-600">{t('stripe.synced')}</span>
                : <span className="font-medium text-amber-600">{t('stripe.notSynced')}</span>}
            </div>
            {isSynced && (
              <div className="flex flex-col gap-1 font-mono text-muted-foreground">
                <span>{t('stripe.productId')} {stripeProductId}</span>
                <span>{t('stripe.priceId')} {stripePriceId}</span>
              </div>
            )}
            <p className="text-muted-foreground">
              {t('stripe.hint', { noun })}
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
                    {t('stripe.confirmDescription', { noun })}
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
      </FieldGroup>

      {serverError && <FieldError>{serverError}</FieldError>}
      <Field orientation="horizontal">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? tc('saving') : isEditing ? t('saveChanges') : t('createButton', { noun })}
        </Button>
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          {tc('reset')}
        </Button>
      </Field>
    </form>
  )
}
