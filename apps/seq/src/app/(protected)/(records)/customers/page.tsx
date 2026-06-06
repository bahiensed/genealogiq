import Link from 'next/link'
import { getCustomers } from '@/queries/customers'
import { CustomersDataTable } from '@/components/customers/customers-data-table'
import { Button } from '@genealogiq/ui/button'

export default async function CustomersPage() {

  const customers = await getCustomers()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          Customers
        </h1>
        <Button asChild>
          <Link href="/customers/new">New customer</Link>
        </Button>
      </div>

      <CustomersDataTable data={customers} />
    </div>
  )
}
