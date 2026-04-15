import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { getSales } from '@/queries/sales'
import { SalesDataTable } from '@/components/sales/sales-data-table'
import { Button } from '@/components/ui/button'

export default async function ManualSalesPage() {
  const session = await verifySession()
  const sales = await getSales()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          Manual Sales
        </h1>
        <Button asChild>
          <Link href="/manual-sales/new">New sale</Link>
        </Button>
      </div>

      <SalesDataTable currentUserRole={session.user.role} data={sales} />
    </div>
  )
}
