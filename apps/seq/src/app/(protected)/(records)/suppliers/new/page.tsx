import { forbidden } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getCustomerModules } from '@/lib/dal'
import { getSupplierCategories } from '@/queries/supplier-categories'
import { SupplierForm } from '@/components/suppliers/supplier-form'

export default async function NewSupplierPage() {
  const modules = await getCustomerModules()
  if (!modules?.moduleRecordsSuppliers) forbidden()

  const categories = await getSupplierCategories()
  const t = await getTranslations('Suppliers')

  return (
    <div className="flex flex-col gap-6">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        {t('new')}
      </h1>
      <SupplierForm categories={categories} />
    </div>
  )
}
