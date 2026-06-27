import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { verifyTenantSession } from '@/lib/dal'
import { getInventoryData } from '@/queries/sales'
import { SalesForm } from '@/components/sales/sales-form'
import { Card, CardContent, CardHeader, CardTitle } from '@genealogiq/ui/card'
import { Separator } from '@genealogiq/ui/separator'

export default async function SalesPage() {
  const { customerId } = await verifyTenantSession()
  const { qrCodeCount, subscriptions, suggestedValue } = await getInventoryData(customerId)
  const t = await getTranslations('Sales')

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle className="scroll-m-20 text-2xl font-bold tracking-tight">
            {t('title')}
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  )
}
