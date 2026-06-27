import { forbidden } from 'next/navigation'
import { getCustomerModules } from '@/lib/dal'

export default async function ProductCategoriesPage() {
  const modules = await getCustomerModules()
  if (!modules?.moduleCategoriesProducts) forbidden()

  return (
    <h1 className="scroll-m-20 text-4xl font-semibold tracking-tight text-balance">
      Product Categories
    </h1>
  )
}
