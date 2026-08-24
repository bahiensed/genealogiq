import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { verifySession } from '@/lib/dal'
import { getPackages } from '@/queries/packages'
import { PackagesDataTable } from '@/components/packages/packages-data-table'
import { Button } from '@genealogiq/ui/button'

// The catalogue only: what we sell, not the stock that came out of it. Issued
// licences moved to /sales/reports, which reports the whole lifecycle —
// funnel, per-reseller breakdown, channel and the sold-but-never-redeemed gap.
export default async function GenCodesPage() {
  const session = await verifySession()
  const t = await getTranslations('Packages')

  const packages = await getPackages()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          {t('gencodesTitle')}
        </h1>
        <Button asChild>
          <Link href="/gencodes/new">{t('newProduct')}</Link>
        </Button>
      </div>

      <PackagesDataTable
        currentUserRole={session.user.role}
        data={packages}
        basePath="/gencodes"
      />
    </div>
  )
}
