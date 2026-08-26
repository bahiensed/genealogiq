import { getLocale, getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'
import { currencyForLocale } from '@genealogiq/core'
import { PlanStore, type StorePlan } from '@/components/purchasing/plan-store'
import { PurchaseStatusToast } from '@/components/purchasing/purchase-status-toast'

export default async function PurchasingPlansPage() {
  await verifyTenantSession()
  const t = await getTranslations('Purchasing')

  // Priced in the language the partner is browsing in, and only shown where it
  // has both a price AND a synced Stripe Price — offering a plan we cannot
  // charge for would fail at checkout with nothing to bill.
  const currency = currencyForLocale(await getLocale()).toUpperCase()

  const rows = await prisma.partnerPlan.findMany({
    where: {
      isActive: true,
      prices: { some: { isActive: true, effectiveTo: null, currency, stripeCashPriceId: { not: null } } },
    },
    select: {
      id: true, name: true, code: true, annualAllowance: true,
      prices: {
        where:  { isActive: true, effectiveTo: null, currency },
        select: {
          currency: true, annualCashAmount: true, unitReferenceAmount: true,
          installmentCount: true, installmentAmount: true, stripeInstallmentPriceId: true,
        },
        take: 1,
      },
    },
    orderBy: { annualAllowance: 'asc' },
  })

  const plans: StorePlan[] = rows.flatMap((r) => {
    const p = r.prices[0]
    if (!p) return []
    return [{
      id: r.id, name: r.name, code: r.code, annualAllowance: r.annualAllowance,
      currency: p.currency,
      annualCashAmount: Number(p.annualCashAmount),
      unitReferenceAmount: p.unitReferenceAmount === null ? null : Number(p.unitReferenceAmount),
      installmentCount:  p.stripeInstallmentPriceId ? p.installmentCount : null,
      installmentAmount: p.stripeInstallmentPriceId && p.installmentAmount !== null
        ? Number(p.installmentAmount)
        : null,
    }]
  })

  return (
    <div className="flex flex-col gap-6">
      <PurchaseStatusToast />
      <div>
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">{t('title')}</h1>
        <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
      </div>
      <PlanStore plans={plans} />
    </div>
  )
}
