import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { getLicenses, getLicenseSummary } from '@/queries/licenses'
import { LicensesDataTable } from '@/components/licenses/licenses-data-table'
import { LicensesCsvButton } from '@/components/licenses/licenses-csv-button'
import { StatCard } from '@/components/ui/stat-card'
import { Button } from '@genealogiq/ui/button'
import { Separator } from '@genealogiq/ui/separator'

export default async function LicensesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const validStatus =
    status === 'AVAILABLE' || status === 'SOLD' || status === 'ACTIVATED' ? status : undefined

  const [licenses, summary] = await Promise.all([
    getLicenses(validStatus),
    getLicenseSummary(),
  ])

  const appUrl = process.env.APP_URL ?? 'https://genealogiq.app'
  const t = await getTranslations('Licenses')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="scroll-m-20 text-4xl font-semibold tracking-tight text-balance">
          {t('title')}
        </h1>
        <div className="flex items-center gap-2">
          <LicensesCsvButton licenses={licenses} appUrl={appUrl} />
          <Button asChild>
            <Link href="/purchasing/plans">{t('buy')}</Link>
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:max-w-4xl">
        <StatCard label={t('summary.available')} value={summary.available} />
        <StatCard label={t('summary.printed')} value={summary.printed} valueClassName="text-blue-600" />
        <StatCard label={t('summary.sold')} value={summary.sold} valueClassName="text-amber-600" />
        <StatCard label={t('summary.activated')} value={summary.activated} valueClassName="text-green-600" />
      </div>

      <Separator />

      {/* Licenses (one row per printable QR code) */}
      <LicensesDataTable data={licenses} appUrl={appUrl} />
    </div>
  )
}
