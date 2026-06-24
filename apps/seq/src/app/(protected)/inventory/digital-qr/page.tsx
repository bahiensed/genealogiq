import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { verifyTenantSession } from '@/lib/dal'
import { getDigitalQrStatement } from '@/queries/digital-qr-statement'
import { DigitalQrStatementTable } from '@/components/inventory/digital-qr-statement-table'
import { Button } from '@genealogiq/ui/button'

export default async function InventoryPackagesPage() {
  const t = await getTranslations('Inventory')
  const session = await verifyTenantSession()
  const { rows, liveBalance, reconciles } = await getDigitalQrStatement(session.customerId)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          {t('digital.title')}
        </h1>
        <Button asChild>
          <Link href="/purchasing/digital-qr">{t('digital.buy')}</Link>
        </Button>
      </div>

      {/* Current balance */}
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">{t('digital.availableForSale')}</p>
        <p className="text-3xl font-bold tabular-nums text-emerald-600">{liveBalance}</p>
        {!reconciles && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t('digital.reconcileNote')}
          </p>
        )}
      </div>

      {/* Statement */}
      <DigitalQrStatementTable data={rows} />
    </div>
  )
}
