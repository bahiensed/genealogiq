import { notFound } from 'next/navigation'
import { getCustomerCategory } from '@/queries/customer-categories'
import { CustomerCategoryForm } from '@/components/customer-categories/customer-category-form'
import { FormShell } from '@genealogiq/ui/form-shell'

export default async function EditCustomerCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const category = await getCustomerCategory(id)
  if (!category) notFound()

  return (
    <FormShell>
      <CustomerCategoryForm
      id={id}
      defaultValues={{
        name:        category.name,
        description: category.description ?? '',
        isActive:    category.isActive,
      }}
      />
    </FormShell>
  )
}
