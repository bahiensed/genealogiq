import { forbidden } from 'next/navigation'
import { getCustomerModules } from '@/lib/dal'
import { SupplierCategoryForm } from '@/components/supplier-categories/supplier-category-form'

export default async function NewSupplierCategoryPage() {
  const modules = await getCustomerModules()
  if (!modules?.moduleCategoriesSuppliers) forbidden()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        New Supplier Category
      </h1>
      <SupplierCategoryForm />
    </div>
  )
}
