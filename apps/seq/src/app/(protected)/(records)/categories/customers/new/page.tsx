import { getTranslations } from 'next-intl/server'
import { CustomerCategoryForm } from '@/components/customer-categories/customer-category-form'

export default async function NewCustomerCategoryPage() {
  const t = await getTranslations('CustomerCategories')

  return (
    <div className="flex flex-col gap-6">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        {t('new')}
      </h1>
      <CustomerCategoryForm />
    </div>
  )
}
