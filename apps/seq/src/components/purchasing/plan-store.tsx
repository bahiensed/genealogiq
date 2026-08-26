'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { toast } from 'sonner'
import { ShoppingCart } from 'lucide-react'
import { subscribeToPartnerPlan } from '@/actions/partner-plan.actions'
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@genealogiq/ui/card'
import { Button } from '@genealogiq/ui/button'
import { Separator } from '@genealogiq/ui/separator'

export interface StorePlan {
  id: string
  name: string
  code: string
  annualAllowance: number
  currency: string
  annualCashAmount: number
  unitReferenceAmount: number | null
  /** Null when this plan is not offered in instalments in this currency. */
  installmentCount: number | null
  installmentAmount: number | null
}

export function PlanStore({ plans }: { plans: StorePlan[] }) {
  const t = useTranslations('Purchasing')

  if (plans.length === 0) {
    return <p className="text-muted-foreground">{t('empty.plans')}</p>
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {plans.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
    </div>
  )
}

function PlanCard({ plan }: { plan: StorePlan }) {
  const router = useRouter()
  const t = useTranslations('Purchasing')
  const locale = useLocale()
  const [cadence, setCadence] = useState<'cash' | 'installment'>('cash')
  const [isPending, startTransition] = useTransition()

  // Formatted in the plan's OWN currency, never a fixed one. The price book is
  // per currency precisely so nothing is ever converted for display, and the
  // previous store hardcoded dollars, which showed a Brazilian partner a
  // dollar sign over an amount in reais.
  const money = new Intl.NumberFormat(locale, { style: 'currency', currency: plan.currency })
  const offersInstalments = plan.installmentCount != null && plan.installmentAmount != null

  function handleBuy() {
    startTransition(async () => {
      const result = await subscribeToPartnerPlan(plan.id, cadence)
      if (!result.ok) { toast.error(result.message); return }
      router.push(result.data!.url)
    })
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>{plan.name}</CardTitle>
        <CardDescription>{t('card.allowance', { count: plan.annualAllowance })}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <div>
          <p className="text-3xl font-bold">{money.format(plan.annualCashAmount)}</p>
          <p className="text-sm text-muted-foreground">{t('card.perCycle')}</p>
          {plan.unitReferenceAmount !== null && (
            <p className="text-xs text-muted-foreground mt-1">
              {t('card.perActivation', { amount: money.format(plan.unitReferenceAmount) })}
            </p>
          )}
        </div>

        <Separator />

        {offersInstalments && (
          <div className="flex flex-col gap-2 mt-auto">
            <button
              type="button"
              onClick={() => setCadence('cash')}
              className={`rounded-md border px-3 py-2 text-left text-sm ${cadence === 'cash' ? 'border-primary bg-primary/5' : ''}`}
            >
              <span className="font-medium">{t('card.cash')}</span>
              <span className="block text-muted-foreground">{money.format(plan.annualCashAmount)}</span>
            </button>
            <button
              type="button"
              onClick={() => setCadence('installment')}
              className={`rounded-md border px-3 py-2 text-left text-sm ${cadence === 'installment' ? 'border-primary bg-primary/5' : ''}`}
            >
              <span className="font-medium">
                {t('card.installments', { count: plan.installmentCount! })}
              </span>
              <span className="block text-muted-foreground">
                {money.format(plan.installmentAmount!)} {t('card.perMonth')}
              </span>
            </button>
          </div>
        )}
      </CardContent>

      <CardFooter className="border-t">
        <Button className="w-full" onClick={handleBuy} disabled={isPending}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          {isPending ? t('card.redirecting') : t('card.subscribe')}
        </Button>
      </CardFooter>
    </Card>
  )
}
