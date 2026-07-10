import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { verifyTenantSession } from '@/lib/dal'
import { getDigitalQrStatement } from '@/queries/digital-qr-statement'
import { DigitalQrStatementTable } from '@/components/inventory/digital-qr-statement-table'
import { StatCard } from '@/components/ui/stat-card'
import { Button } from '@genealogiq/ui/button'
import { Separator } from '@genealogiq/ui/separator'

export default async function InventoryPackagesPage() {
  const t = await getTranslations('Inventory')
  const session = await verifyTenantSession()
  const { rows, liveBalance, reconciles } = await getDigitalQrStatement(session.customerId)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="scroll-m-20 text-4xl font-semibold tracking-tight text-balance">
          {t('digital.title')}
        </h1>
        <Button asChild>
          <Link href="/purchasing/digital-qr">{t('digital.buy')}</Link>
        </Button>
      </div>

      {/* Current balance */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:max-w-4xl">
          <StatCard label={t('digital.availableForSale')} value={liveBalance} valueClassName="text-emerald-600" />
        </div>
        {!reconciles && (
          <p className="text-xs text-muted-foreground">{t('digital.reconcileNote')}</p>
        )}
      </div>

      <Separator />

      {/* Statement */}
      <DigitalQrStatementTable data={rows} />
    </div>
  )
}
