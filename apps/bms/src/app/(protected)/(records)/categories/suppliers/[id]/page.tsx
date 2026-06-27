import { notFound } from 'next/navigation'
import { getSupplierCategory } from '@/queries/supplier-categories'
import { SupplierCategoryForm } from '@/components/supplier-categories/supplier-category-form'

export default async function EditSupplierCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const category = await getSupplierCategory(id)
  if (!category) notFound()

  return (
    <SupplierCategoryForm
      id={id}
      defaultValues={{
        name:        category.name,
        description: category.description ?? '',
        isActive:    category.isActive,
      }}
    />
  )
}
