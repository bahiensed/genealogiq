import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { getSuppliers } from '@/queries/suppliers'
import { SuppliersDataTable } from '@/components/suppliers/suppliers-data-table'
import { Button } from '@/components/ui/button'

export default async function SuppliersPage() {
  const session = await verifySession()
  const suppliers = await getSuppliers()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          Suppliers
        </h1>
        <Button asChild>
          <Link href="/suppliers/new">New supplier</Link>
        </Button>
      </div>

      <SuppliersDataTable currentUserRole={session.user.role} data={suppliers} />
    </div>
  )
}
