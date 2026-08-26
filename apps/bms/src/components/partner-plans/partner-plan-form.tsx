'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { getPartnerPlanSchema, type PartnerPlanFormValues } from '@/schemas/partner-plan.schema'
import { updatePartnerPlan, syncPartnerPlan } from '@/actions/partner-plan.actions'
import { PartnerPlanFields } from './partner-plan-fields'
import { Button } from '@genealogiq/ui/button'
import { Switch } from '@genealogiq/ui/switch'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@genealogiq/ui/card'
import { Separator } from '@genealogiq/ui/separator'
import { Field, FieldError } from '@genealogiq/ui/field'

export interface StripePriceState {
  currency: string
  cash: string | null
  installment: string | null
  version: number
}

interface PartnerPlanFormProps {
  id: string
  defaultValues: PartnerPlanFormValues
  stripeProductId: string | null
  prices: StripePriceState[]
}

export function PartnerPlanForm({ id, defaultValues, stripeProductId, prices }: PartnerPlanFormProps) {
  const t    = useTranslations('PartnerPlans')
  const tc   = useTranslations('Common')
  const tErr = useTranslations('Errors')

  const [serverError, setServerError] = useState<string | null>(null)
  const [isSyncing, startSync] = useTransition()
  const router = useRouter()

  // A plan is only sellable where its cash Price exists in Stripe. Reporting
  // this per currency rather than as one badge is what stops "why can nobody
  // buy Árvore in pesos" from being a mystery.
  const pending = prices.filter((p) => !p.cash)

  function handleSync() {
    startSync(async () => {
      const result = await syncPartnerPlan(id)
      if (!result.ok) toast.error(result.message)
      else {
        if (result.message) toast.success(result.message)
        router.refresh()
      }
    })
  }

  const form = useForm<PartnerPlanFormValues>({
    resolver: useMemo(() => zodResolver(getPartnerPlanSchema(tErr)), [tErr]),
    defaultValues,
  })

  const { control, handleSubmit, formState: { isSubmitting } } = form

  async function onSubmit(data: PartnerPlanFormValues) {
    setServerError(null)
    const result = await updatePartnerPlan(id, data)
    if (!result.ok) setServerError(result.message)
    else {
      if (result.message) toast.success(result.message)
      router.refresh()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="scroll-m-20 text-2xl font-bold tracking-tight">
          {t('form.editTitle', { name: defaultValues.name })}
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
          <PartnerPlanFields control={control} />

          <div className="rounded-lg border bg-muted/30 px-4 py-3 flex flex-col gap-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground uppercase tracking-wider">{t('stripe.title')}</span>
              {pending.length === 0
                ? <span className="font-medium text-emerald-600">{t('stripe.synced')}</span>
                : <span className="font-medium text-amber-600">{t('stripe.notSynced')}</span>}
            </div>
            <div className="flex flex-col gap-1 font-mono text-muted-foreground">
              <span>{t('stripe.productId')} {stripeProductId ?? '—'}</span>
              {prices.map((p) => (
                <span key={p.currency}>
                  {p.currency} v{p.version}: {p.cash ?? '—'} / {p.installment ?? '—'}
                </span>
              ))}
            </div>
            {/* Saving a changed amount opens a new price version, which has no
                Stripe Price until this runs — so the plan stops being sellable
                until it does. Saying so here is cheaper than discovering it at
                the till. */}
            <p className="text-muted-foreground">{t('stripe.hint')}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              disabled={isSyncing}
              onClick={handleSync}
            >
              {isSyncing ? t('stripe.syncing') : t('stripe.syncButton')}
            </Button>
          </div>

          {serverError && <FieldError>{serverError}</FieldError>}
          <Field orientation="horizontal">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tc('saving') : t('form.save')}
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
