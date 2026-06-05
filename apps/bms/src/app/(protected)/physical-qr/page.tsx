import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { getPackages } from '@/queries/packages'
import { getPhysicalQrSummary, getPhysicalQrTotals } from '@/queries/physical-qr'
import { PackagesDataTable } from '@/components/packages/packages-data-table'
import { PhysicalQrDataTable } from '@/components/physical-qr/physical-qr-data-table'
import { Button } from '@/components/ui/button'

export default async function PhysicalQrPage() {
  const session = await verifySession()

  const [packages, rows, totals] = await Promise.all([
    getPackages('PHYSICAL'),
    getPhysicalQrSummary(),
    getPhysicalQrTotals(),
  ])

  return (
    <div className="flex flex-col gap-10">

      {/* ── Physical QR Packages ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
            Physical QR Packages
          </h1>
          <Button asChild>
            <Link href="/physical-qr/new">New package</Link>
          </Button>
        </div>

        <PackagesDataTable
          currentUserRole={session.user.role}
          data={packages}
          basePath="/physical-qr"
          emptyMessage="No physical QR packages yet."
        />
      </div>

      {/* ── License Issuance ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6">
        <h2 className="scroll-m-20 text-2xl font-bold tracking-tight">
          License Issuance
        </h2>

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

    </div>
  )
}
