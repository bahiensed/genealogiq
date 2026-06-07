import { notFound, forbidden } from 'next/navigation'
import { getCustomerModules } from '@/lib/dal'
import { getSupplierCategory } from '@/queries/supplier-categories'
import { SupplierCategoryForm } from '@/components/supplier-categories/supplier-category-form'

export default async function EditSupplierCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const modules = await getCustomerModules()
  if (!modules?.moduleCategoriesSuppliers) forbidden()

  const category = await getSupplierCategory(id)
  if (!category) notFound()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        Edit supplier category
      </h1>
      <SupplierCategoryForm
        id={id}
        defaultValues={{
          name:        category.name,
          description: category.description ?? '',
          isActive:    category.isActive,
        }}
      />
    </div>
  )
}
