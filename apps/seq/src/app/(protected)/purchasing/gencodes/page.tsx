import { Suspense } from 'react'
import { getLocale, getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'
import { currencyForLocale } from '@genealogiq/core'
import { QRStore } from '@/components/purchasing/qr-store'
import { PurchaseStatusToast } from '@/components/purchasing/purchase-status-toast'

export default async function PurchasingGenCodePage() {
  await verifyTenantSession()

  const t = await getTranslations('Purchasing')

  // Priced in the language the tenant is browsing in, and only shown if it has
  // a price there — offering a product we cannot charge for would fail at
  // checkout with nothing to bill.
  const currency = currencyForLocale(await getLocale())
  const PRICE      = { usd: 'priceUsd', brl: 'priceBrl', mxn: 'priceMxn' } as const
  const PRICE_ID   = { usd: 'stripeAnnualPriceIdUsd', brl: 'stripeAnnualPriceIdBrl', mxn: 'stripeAnnualPriceIdMxn' } as const
  const MONTHLY    = { usd: 'monthlyPriceUsd', brl: 'monthlyPriceBrl', mxn: 'monthlyPriceMxn' } as const
  const MONTHLY_ID = { usd: 'stripeMonthlyPriceIdUsd', brl: 'stripeMonthlyPriceIdBrl', mxn: 'stripeMonthlyPriceIdMxn' } as const

  const packages = await prisma.package.findMany({
    where: {
      isActive: true,
      [PRICE[currency]]:    { gt: 0 },
      [PRICE_ID[currency]]: { not: null },
    },
    select: {
      id:          true,
      name:        true,
      description: true,
      quantity:    true,
      termLength:  true,
      priceUsd:    true, monthlyPriceUsd: true,
      priceBrl:    true, monthlyPriceBrl: true,
      priceMxn:    true, monthlyPriceMxn: true,
      stripeMonthlyPriceIdUsd: true,
      stripeMonthlyPriceIdBrl: true,
      stripeMonthlyPriceIdMxn: true,
    },
    orderBy: { quantity: 'asc' },
  })

  const data = packages.map((p) => ({
    id:          p.id,
    name:        p.name,
    description: p.description,
    quantity:    p.quantity,
    termLength:  p.termLength,
    price:       Number(p[PRICE[currency]]),
    // Instalments are offered only where the amount AND its Stripe Price both
    // exist — showing the option otherwise would fail at checkout.
    monthlyPrice: p[MONTHLY[currency]] !== null && p[MONTHLY_ID[currency]]
      ? Number(p[MONTHLY[currency]])
      : null,
  }))

  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={null}>
        <PurchaseStatusToast />
      </Suspense>
      <div className="flex flex-col gap-1">
        <h1 className="scroll-m-20 text-4xl font-semibold tracking-tight text-balance">
          {t('physical.title')}
        </h1>
        <p className="text-muted-foreground text-balance">
          {t('physical.subtitle')}
        </p>
      </div>
      <QRStore packages={data} variant="physical" />
    </div>
  )
}
