import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { getSupplierCategories } from '@/queries/supplier-categories'
import { SupplierCategoriesDataTable } from '@/components/supplier-categories/supplier-categories-data-table'
import { Button } from '@/components/ui/button'

export default async function SupplierCategoriesPage() {
  const session = await verifySession()
  const categories = await getSupplierCategories()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          Supplier Categories
        </h1>
        <Button asChild>
          <Link href="/supplier-categories/new">New category</Link>
        </Button>
      </div>

      <SupplierCategoriesDataTable currentUserRole={session.user.role} data={categories} />
    </div>
  )
}
