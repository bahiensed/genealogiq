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
  const validStatus =
    status === 'AVAILABLE' || status === 'SOLD' || status === 'ACTIVATED' ? status : undefined

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

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Available for sale" value={summary.available} accent="text-emerald-600" />
        <SummaryCard label="Sold" value={summary.sold} accent="text-amber-600" />
        <SummaryCard label="Activated" value={summary.activated} />
        <SummaryCard label="Printed" value={summary.printed} />
      </div>

      {/* Licenses (one row per printable QR code) */}
      <LicensesDataTable data={licenses} appUrl={appUrl} />
    </div>
  )
}

function SummaryCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${accent ?? ''}`}>{value}</p>
    </div>
  )
}
