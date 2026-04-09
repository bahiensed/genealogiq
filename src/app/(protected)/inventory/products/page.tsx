import { forbidden } from 'next/navigation'
import { getCustomerModules } from '@/lib/dal'

export default async function InventoryProductsPage() {
  const modules = await getCustomerModules()
  if (!modules?.moduleInventoryProducts) forbidden()

  return (
    <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
      Products
    </h1>
  )
}
