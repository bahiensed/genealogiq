import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { verifySession } from '@/lib/dal'
import { getSupplierCategories } from '@/queries/supplier-categories'
import { SupplierCategoriesDataTable } from '@/components/supplier-categories/supplier-categories-data-table'
import { Button } from '@genealogiq/ui/button'

export default async function SupplierCategoriesPage() {
  const session = await verifySession()
  const categories = await getSupplierCategories()
  const t = await getTranslations('SupplierCategories')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          {t('title')}
        </h1>
        <Button asChild>
          <Link href="/categories/suppliers/new">{t('new')}</Link>
        </Button>
      </div>

      <SupplierCategoriesDataTable currentUserRole={session.user.role} data={categories} />
    </div>
  )
}
