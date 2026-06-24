import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getCustomerCategory } from '@/queries/customer-categories'
import { CustomerCategoryForm } from '@/components/customer-categories/customer-category-form'

export default async function EditCustomerCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const category = await getCustomerCategory(id)
  if (!category) notFound()

  const t = await getTranslations('CustomerCategories')

  return (
    <div className="flex flex-col gap-6">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        {t('edit')}
      </h1>
      <CustomerCategoryForm
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
