'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  getPartnerPlanSchema,
  partnerPlanDefaultValues,
  type PartnerPlanFormValues,
} from '@/schemas/partner-plan.schema'
import { createPartnerPlan } from '@/actions/partner-plan.actions'
import { PartnerPlanFields } from './partner-plan-fields'
import { Button } from '@genealogiq/ui/button'
import { Switch } from '@genealogiq/ui/switch'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@genealogiq/ui/card'
import { Separator } from '@genealogiq/ui/separator'
import { Field, FieldError } from '@genealogiq/ui/field'

/**
 * A full page rather than the dialog the old product catalogue used.
 *
 * A plan is not four fields any more: it carries the commercial terms the whole
 * franchise model reads — allowance, rollover cap and validity, grace, committed
 * reservation, trial — plus a price book in three currencies. Putting that in a
 * dialog would hide half of it behind a scroll.
 */
export function NewPlanForm() {
  const t    = useTranslations('PartnerPlans')
  const tc   = useTranslations('Common')
  const tErr = useTranslations('Errors')
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<PartnerPlanFormValues>({
    resolver: useMemo(() => zodResolver(getPartnerPlanSchema(tErr)), [tErr]),
    defaultValues: partnerPlanDefaultValues,
  })

  const { control, handleSubmit, formState: { isSubmitting } } = form

  async function onSubmit(data: PartnerPlanFormValues) {
    setServerError(null)
    const result = await createPartnerPlan(data)
    if (!result.ok) { setServerError(result.message); return }
    if (result.message) toast.success(result.message)
    // Straight to the list, where the Stripe column says out loud that the new
    // plan is unsellable until it is synced.
    router.push('/plans')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="scroll-m-20 text-2xl font-bold tracking-tight">{t('form.newTitle')}</CardTitle>
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
          <p className="text-xs text-muted-foreground">{t('form.syncAfterCreate')}</p>
          {serverError && <FieldError>{serverError}</FieldError>}
          <Field orientation="horizontal">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tc('saving') : t('form.create')}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push('/plans')}>
              {tc('cancel')}
            </Button>
          </Field>
        </form>
      </CardContent>
    </Card>
  )
}
