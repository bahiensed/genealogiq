'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { getPackageSchema, type PackageFormValues } from '@/schemas/package.schema'
import { updatePackage, syncPackageWithStripe } from '@/actions/package.actions'
import { PackageFields } from '@/components/packages/package-fields'
import { Button } from '@genealogiq/ui/button'
import { Switch } from '@genealogiq/ui/switch'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@genealogiq/ui/card'
import { Separator } from '@genealogiq/ui/separator'
import { Field, FieldError } from '@genealogiq/ui/field'
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

interface PackageFormProps {
  id:               string
  defaultValues:    PackageFormValues
  stripeProductId?: string | null
  stripePriceIds?:  Record<'usd' | 'brl' | 'mxn', { annual: string | null; monthly: string | null }>
}

// Edit only. Creating a product is a dialog on the list (new-product-dialog),
// because it is four fields with nothing to load first; this form exists as a
// page because it carries the Stripe panel and addresses a specific record.
export function PackageForm({ id, defaultValues, stripeProductId, stripePriceIds }: PackageFormProps) {
  const t    = useTranslations('Packages')
  const tc   = useTranslations('Common')
  const tErr = useTranslations('Errors')
  // Sync is per currency now: a product can be live in reais and unsynced in
  // dollars, and the panel has to say which is which rather than one badge for
  // the whole row.
  // Sync is per currency AND per cadence: a product can be live annually in
  // reais and still missing its monthly Price. Only what is priced can be out of
  // sync — an unpriced cadence is not missing anything.
  const currencies = (['usd', 'brl', 'mxn'] as const).map((k) => {
    const annualPrice  = defaultValues[`price${k[0].toUpperCase()}${k.slice(1)}` as 'priceUsd']
    const monthlyPrice = defaultValues[`monthlyPrice${k[0].toUpperCase()}${k.slice(1)}` as 'monthlyPriceUsd']
    const ids = stripePriceIds?.[k] ?? { annual: null, monthly: null }
    return {
      code:    k.toUpperCase(),
      pending: (annualPrice > 0 && !ids.annual) || (monthlyPrice > 0 && !ids.monthly),
      priced:  annualPrice > 0 || monthlyPrice > 0,
      ids,
    }
  })
  const isSynced = currencies.every((c) => !c.pending)
  const noun = t('noun.product')
  const [serverError, setServerError] = useState<string | null>(null)
  const [syncOpen, setSyncOpen]       = useState(false)
  const [isSyncing, startSync]        = useTransition()
  const router = useRouter()

  function handleSync() {
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

  const form = useForm<PackageFormValues>({
    resolver: useMemo(() => zodResolver(getPackageSchema(tErr)), [tErr]),
    defaultValues,
  })

  const { control, handleSubmit, formState: { isSubmitting } } = form

  async function onSubmit(data: PackageFormValues) {
    setServerError(null)
    const result = await updatePackage(id, data)
    if (!result.ok) {
      setServerError(result.message)
    } else if (result.message) {
      toast.success(result.message)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="scroll-m-20 text-2xl font-bold tracking-tight">
          {t('edit', { noun })}
        </CardTitle>
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
      </CardHeader>
      <Separator />
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">

          <div className="flex flex-col gap-6">
            <PackageFields control={control} />

            <div className="rounded-lg border bg-muted/30 px-4 py-3 flex flex-col gap-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground uppercase tracking-wider">{t('stripe.title')}</span>
                {isSynced
                  ? <span className="font-medium text-emerald-600">{t('stripe.synced')}</span>
                  : <span className="font-medium text-amber-600">{t('stripe.notSynced')}</span>}
              </div>
              <div className="flex flex-col gap-1 font-mono text-muted-foreground">
                <span>{t('stripe.productId')} {stripeProductId ?? '—'}</span>
                {currencies.filter((c) => c.priced).map((c) => (
                  <span key={c.code}>
                    {c.code}: {c.ids.annual ?? '—'} / {c.ids.monthly ?? '—'}
                  </span>
                ))}
              </div>
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
          </div>

          {serverError && <FieldError>{serverError}</FieldError>}
          <Field orientation="horizontal">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tc('saving') : t('saveChanges')}
            </Button>
            <Button type="button" variant="outline" onClick={() => form.reset()}>
              {tc('reset')}
            </Button>
          </Field>
        </form>
      </CardContent>
    </Card>
  )
}
