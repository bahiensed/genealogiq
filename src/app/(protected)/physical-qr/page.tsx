import { getPhysicalQrSummary, getPhysicalQrTotals } from '@/queries/physical-qr'
import { PhysicalQrDataTable } from '@/components/physical-qr/physical-qr-data-table'

export default async function PhysicalQrPage() {
  const [rows, totals] = await Promise.all([
    getPhysicalQrSummary(),
    getPhysicalQrTotals(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        Physical QR Codes
      </h1>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total issued</p>
          <p className="text-3xl font-bold tabular-nums">{totals.total}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Activated</p>
          <p className="text-3xl font-bold tabular-nums text-emerald-600">{totals.activated}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Available</p>
          <p className="text-3xl font-bold tabular-nums">{totals.available}</p>
        </div>
      </div>

      <PhysicalQrDataTable data={rows} />
    </div>
  )
}
