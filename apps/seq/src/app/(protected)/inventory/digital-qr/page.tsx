import Link from 'next/link'
import { verifyTenantSession } from '@/lib/dal'
import { getDigitalQrStatement } from '@/queries/digital-qr-statement'
import { DigitalQrStatementTable } from '@/components/inventory/digital-qr-statement-table'
import { Button } from '@genealogiq/ui/button'

export default async function InventoryPackagesPage() {
  const session = await verifyTenantSession()
  const { rows, liveBalance, reconciles } = await getDigitalQrStatement(session.customerId)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          My Digital QR Codes
        </h1>
        <Button asChild>
          <Link href="/purchasing/digital-qr">Buy digital QR codes</Link>
        </Button>
      </div>

      {/* Current balance */}
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">Available for sale</p>
        <p className="text-3xl font-bold tabular-nums text-emerald-600">{liveBalance}</p>
        {!reconciles && (
          <p className="mt-1 text-xs text-muted-foreground">
            Note: the statement below was reconstructed from purchases and sales and may differ
            slightly from this live total (e.g. reversed sales or manual adjustments).
          </p>
        )}
      </div>

      {/* Statement */}
      <DigitalQrStatementTable data={rows} />
    </div>
  )
}
