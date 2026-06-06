import Link from 'next/link'
import { getCustomerCategories } from '@/queries/customer-categories'
import { CustomerCategoriesDataTable } from '@/components/customer-categories/customer-categories-data-table'
import { Button } from '@genealogiq/ui/button'

export default async function CustomerCategoriesPage() {

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

      <CustomerCategoriesDataTable data={categories} />
    </div>
  )
}
