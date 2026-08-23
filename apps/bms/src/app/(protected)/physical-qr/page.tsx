import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { verifySession } from '@/lib/dal'
import { getPackages } from '@/queries/packages'
import { getPhysicalQrSummary, getPhysicalQrTotals } from '@/queries/physical-qr'
import { PackagesDataTable } from '@/components/packages/packages-data-table'
import { PhysicalQrDataTable } from '@/components/physical-qr/physical-qr-data-table'
import { Button } from '@genealogiq/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@genealogiq/ui/card'

export default async function PhysicalQrPage() {
  const session = await verifySession()
  const t = await getTranslations('Packages')
  const tq = await getTranslations('PhysicalQr')

  const [packages, licenses, totals] = await Promise.all([
    getPackages('PHYSICAL'),
    getPhysicalQrSummary(),
    getPhysicalQrTotals(),
  ])

  const stats = [
    { label: tq('stats.total'),     value: totals.total,     cls: '' },
    { label: tq('stats.activated'), value: totals.activated, cls: 'text-emerald-600' },
    { label: tq('stats.sold'),      value: totals.sold,      cls: 'text-amber-600' },
    { label: tq('stats.available'), value: totals.available, cls: 'text-muted-foreground' },
  ]

  return (
    <div className="flex flex-col gap-10">

      {/* ── Physical QR Codes ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
            {t('physicalTitle')}
          </h1>
          <Button asChild>
            <Link href="/physical-qr/new">{t('newProduct')}</Link>
          </Button>
        </div>

        <PackagesDataTable
          currentUserRole={session.user.role}
          data={packages}
          basePath="/physical-qr"
          noun="product"
        />
      </div>

      {/* ── Issued licenses ───────────────────────────────────────────────
          The section above is the catalogue (what we sell); this one is the
          stock that came out of it. Without it the back-office could see the
          SKU but never a single GenCode. */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="scroll-m-20 text-2xl font-bold tracking-tight">{tq('title')}</h2>
          <p className="text-sm text-muted-foreground">{tq('subtitle')}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${s.cls}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <PhysicalQrDataTable data={licenses} />
      </div>

    </div>
  )
}
