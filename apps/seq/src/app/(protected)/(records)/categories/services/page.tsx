import { forbidden } from 'next/navigation'
import { getCustomerModules } from '@/lib/dal'

export default async function ServiceCategoriesPage() {
  const modules = await getCustomerModules()
  if (!modules?.moduleCategoriesServices) forbidden()

  return (
    <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
      Service Categories
    </h1>
  )
}
