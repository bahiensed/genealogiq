import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'
import { QRStore } from '@/components/purchasing/qr-store'
import { PurchaseStatusToast } from '@/components/purchasing/purchase-status-toast'

export default async function PurchasingGenCodePage() {
  await verifyTenantSession()

  const t = await getTranslations('Purchasing')

  const packages = await prisma.package.findMany({
    where: { isActive: true, type: 'PHYSICAL' },
    select: {
      id:          true,
      name:        true,
      description: true,
      price:       true,
      quantity:    true,
    },
    orderBy: { quantity: 'asc' },
  })

  const data = packages.map((p) => ({ ...p, price: Number(p.price) }))

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
