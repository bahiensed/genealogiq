import { forbidden } from 'next/navigation'
import { getCustomerModules } from '@/lib/dal'

export default async function ProductsPage() {
  const modules = await getCustomerModules()
  if (!modules?.moduleRecordsProducts) forbidden()

  return (
    <h1 className="scroll-m-20 text-4xl font-semibold tracking-tight text-balance">
      Products
    </h1>
  )
}
