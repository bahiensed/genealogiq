import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { verifyTenantSession } from '@/lib/dal'
import { getInventoryData } from '@/queries/sales'
import { SalesForm } from '@/components/sales/sales-form'

export default async function SalesPage() {
  const { customerId } = await verifyTenantSession()
  const { qrCodeCount, subscriptions, suggestedValue } = await getInventoryData(customerId)
  const t = await getTranslations('Sales')

  return (
    <div className="flex flex-col gap-6">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        {t('title')}
      </h1>

      {qrCodeCount === 0 ? (
        <p className="text-muted-foreground">
          {t('emptyInventory')}{' '}
          <Link href="/purchasing/digital-qr" className="underline underline-offset-4 hover:text-primary">
            {t('buyQrCodes')}
          </Link>
        </p>
      ) : (
        <SalesForm subscriptions={subscriptions} suggestedValue={suggestedValue} />
      )}
    </div>
  )
}
