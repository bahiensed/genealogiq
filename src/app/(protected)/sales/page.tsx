import Link from 'next/link'
import { verifyTenantSession } from '@/lib/dal'
import { getInventoryData } from '@/queries/sales'
import { SalesForm } from '@/components/sales/sales-form'

export default async function SalesPage() {
  const { customerId } = await verifyTenantSession()
  const { qrCodeCount, subscriptions, suggestedValue } = await getInventoryData(customerId)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        Sales
      </h1>

      {qrCodeCount === 0 ? (
        <p className="text-muted-foreground">
          No QR codes in inventory.{' '}
          <Link href="/purchasing/packages" className="underline underline-offset-4 hover:text-primary">
            Buy QR codes
          </Link>
        </p>
      ) : (
        <SalesForm subscriptions={subscriptions} suggestedValue={suggestedValue} />
      )}
    </div>
  )
}
