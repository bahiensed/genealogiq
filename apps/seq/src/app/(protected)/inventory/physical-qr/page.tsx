import Link from 'next/link'
import { getLicenses, getLicenseSummary } from '@/queries/licenses'
import { LicensesDataTable } from '@/components/licenses/licenses-data-table'
import { LicensesCsvButton } from '@/components/licenses/licenses-csv-button'
import { Button } from '@genealogiq/ui/button'

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
          My Physical QR Codes
        </h1>
        <div className="flex items-center gap-2">
          <LicensesCsvButton licenses={licenses} appUrl={appUrl} />
          <Button asChild>
            <Link href="/purchasing/physical-qr">Buy physical QR codes</Link>
          </Button>
        </div>
      </div>

      {/* Available balance — mirrors the Digital QR inventory page */}
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">Available for sale</p>
        <p className="text-3xl font-bold tabular-nums text-emerald-600">{summary.available}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {summary.total} total · {summary.activated} activated
        </p>
      </div>

      {/* Licenses (one row per printable QR code) */}
      <LicensesDataTable data={licenses} appUrl={appUrl} />
    </div>
  )
}
