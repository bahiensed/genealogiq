import Link from 'next/link'
import { forbidden } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getCustomerModules } from '@/lib/dal'
import { getSuppliers } from '@/queries/suppliers'
import { SuppliersDataTable } from '@/components/suppliers/suppliers-data-table'
import { Button } from '@genealogiq/ui/button'

export default async function SuppliersPage() {
  const modules = await getCustomerModules()
  if (!modules?.moduleRecordsSuppliers) forbidden()

  const suppliers = await getSuppliers()
  const t = await getTranslations('Suppliers')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          {t('title')}
        </h1>
        <Button asChild>
          <Link href="/suppliers/new">{t('new')}</Link>
        </Button>
      </div>

      <SuppliersDataTable data={suppliers} />
    </div>
  )
}
