import { getTranslations } from 'next-intl/server'
import { SupplierCategoryForm } from '@/components/supplier-categories/supplier-category-form'

export default async function NewSupplierCategoryPage() {
  const t = await getTranslations('SupplierCategories')

  return (
    <div className="flex flex-col gap-6">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        {t('new')}
      </h1>
      <SupplierCategoryForm />
    </div>
  )
}
