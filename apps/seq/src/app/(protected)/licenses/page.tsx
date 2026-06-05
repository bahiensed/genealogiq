import { getLicenses, getLicenseSummary } from '@/queries/licenses'
import { LicensesDataTable } from '@/components/licenses/licenses-data-table'
import { LicensesCsvButton } from '@/components/licenses/licenses-csv-button'

export default async function LicensesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const validStatus = status === 'AVAILABLE' || status === 'ACTIVATED' ? status : undefined

  const [licenses, summary] = await Promise.all([
    getLicenses(validStatus),
    getLicenseSummary(),
  ])

  const appUrl = process.env.APP_URL ?? 'https://genealogiq.app'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          QR Licenses
        </h1>
        <LicensesCsvButton licenses={licenses} appUrl={appUrl} />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-3xl font-bold tabular-nums">{summary.total}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Available</p>
          <p className="text-3xl font-bold tabular-nums text-emerald-600">{summary.available}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Activated</p>
          <p className="text-3xl font-bold tabular-nums">{summary.activated}</p>
        </div>
      </div>

      <LicensesDataTable data={licenses} appUrl={appUrl} />
    </div>
  )
}
