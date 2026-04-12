import Link from 'next/link'
import { verifyTenantSession } from '@/lib/dal'
import { getAvailableLicenses } from '@/queries/sales'
import { SalesForm } from '@/components/sales/sales-form'

export default async function SalesPage() {
  const { customerId } = await verifyTenantSession()
  const licenses = await getAvailableLicenses(customerId)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        Sales
      </h1>

      {licenses.length === 0 ? (
        <p className="text-muted-foreground">
          Sem licenças disponíveis no inventário.{' '}
          <Link href="/purchasing/licenses" className="underline underline-offset-4 hover:text-primary">
            Comprar licenças
          </Link>
        </p>
      ) : (
        <SalesForm licenses={licenses} />
      )}
    </div>
  )
}
