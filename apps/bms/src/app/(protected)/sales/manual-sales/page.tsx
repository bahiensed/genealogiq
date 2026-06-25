import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { verifySession } from '@/lib/dal'
import { getSales } from '@/queries/sales'
import { SalesDataTable } from '@/components/sales/sales-data-table'
import { Button } from '@genealogiq/ui/button'

export default async function ManualSalesPage() {
  const session = await verifySession()
  const sales = await getSales()
  const t = await getTranslations('Sales')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          {t('title')}
        </h1>
        <Button asChild>
          <Link href="/sales/manual-sales/new">{t('newButton')}</Link>
        </Button>
      </div>

      <SalesDataTable currentUserRole={session.user.role} data={sales} />
    </div>
  )
}
