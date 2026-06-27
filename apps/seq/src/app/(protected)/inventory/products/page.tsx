import { forbidden } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getCustomerModules } from '@/lib/dal'

export default async function InventoryProductsPage() {
  const modules = await getCustomerModules()
  if (!modules?.moduleInventoryProducts) forbidden()

  const t = await getTranslations('Inventory')

  return (
    <h1 className="scroll-m-20 text-4xl font-semibold tracking-tight text-balance">
      {t('products.title')}
    </h1>
  )
}
