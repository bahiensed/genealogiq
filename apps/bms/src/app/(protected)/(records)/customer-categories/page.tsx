import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { getCustomerCategories } from '@/queries/customer-categories'
import { CustomerCategoriesDataTable } from '@/components/customer-categories/customer-categories-data-table'
import { Button } from '@/components/ui/button'

export default async function CustomerCategoriesPage() {
  const session = await verifySession()
  const categories = await getCustomerCategories()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          Customer Categories
        </h1>
        <Button asChild>
          <Link href="/customer-categories/new">New category</Link>
        </Button>
      </div>

      <CustomerCategoriesDataTable currentUserRole={session.user.role} data={categories} />
    </div>
  )
}
