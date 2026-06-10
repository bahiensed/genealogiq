import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'
import { QRStore } from '@/components/purchasing/qr-store'
import { PurchaseStatusToast } from '@/components/purchasing/purchase-status-toast'

export default async function PurchasingPhysicalQrPage() {
  await verifyTenantSession()

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
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        Buy Physical QR Codes
      </h1>
      <QRStore packages={data} variant="physical" />
    </div>
  )
}
