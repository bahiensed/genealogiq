import { getLocale, getTranslations } from 'next-intl/server'
import { AlertTriangle, PackageCheck, ShoppingCart, CheckCircle2, Warehouse } from 'lucide-react'
import { verifySession } from '@/lib/dal'
import {
  getGenCodeFunnel,
  getResellerBreakdown,
  getChannelBreakdown,
  getRevenueByPackage,
  STALE_AFTER_DAYS,
} from '@/queries/reports'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@genealogiq/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@genealogiq/ui/table'

function pct(part: number, whole: number): string {
  if (whole === 0) return '—'
  return `${Math.round((part / whole) * 100)}%`
}

export default async function SalesReportsPage() {
  await verifySession()
  const t = await getTranslations('SalesReports')
  const locale = await getLocale()
  const usd = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' })

  const [funnel, resellers, channels, packages] = await Promise.all([
    getGenCodeFunnel(),
    getResellerBreakdown(),
    getChannelBreakdown(),
    getRevenueByPackage(),
  ])

  const cards = [
    { label: t('funnel.issued'),    value: funnel.issued,    icon: PackageCheck, cls: '' },
    { label: t('funnel.sold'),      value: funnel.sold,      icon: ShoppingCart, cls: 'text-amber-600',   sub: pct(funnel.sold, funnel.issued) },
    { label: t('funnel.activated'), value: funnel.activated, icon: CheckCircle2, cls: 'text-emerald-600', sub: pct(funnel.activated, funnel.sold) },
    { label: t('funnel.available'), value: funnel.available, icon: Warehouse,    cls: 'text-muted-foreground' },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* ── Funnel ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <CardAction><c.icon className="h-5 w-5 text-muted-foreground" /></CardAction>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${c.cls}`}>{c.value}</p>
              {c.sub && <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* The one number nobody could see before: codes a reseller wrote off and
          the buyer never redeemed. Every one is a customer lost between the
          counter and the app. */}
      {funnel.stale > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              {t('stale.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">{funnel.stale}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('stale.description', { days: STALE_AFTER_DAYS })}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Per reseller ───────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight">{t('resellers.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('resellers.subtitle')}</p>
        </div>
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('resellers.tenant')}</TableHead>
                <TableHead className="text-right">{t('resellers.issued')}</TableHead>
                <TableHead className="text-right">{t('resellers.sold')}</TableHead>
                <TableHead className="text-right">{t('resellers.activated')}</TableHead>
                <TableHead className="text-right">{t('resellers.rate')}</TableHead>
                <TableHead className="text-right">{t('resellers.stale')}</TableHead>
                <TableHead className="text-right">{t('resellers.resaleValue')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resellers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">{t('empty')}</TableCell>
                </TableRow>
              ) : resellers.map((r) => (
                <TableRow key={r.tenantId}>
                  <TableCell className="font-medium">{r.tenantName}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.issued}</TableCell>
                  <TableCell className="text-right tabular-nums text-amber-600">{r.sold}</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600">{r.activated}</TableCell>
                  <TableCell className="text-right tabular-nums">{pct(r.activated, r.sold)}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.stale || '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {usd.format(r.resaleValue)}
                    {r.valueMissing > 0 && (
                      <span className="block text-xs text-muted-foreground">
                        {t('resellers.valueMissing', { count: r.valueMissing })}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* ── Channel ────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight">{t('channels.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('channels.subtitle')}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {channels.map((c) => (
            <Card key={c.channel}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t(`channels.${c.channel}`)}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-baseline justify-between">
                <p className="text-3xl font-bold">{c.count}</p>
                <p className="text-sm text-muted-foreground">{usd.format(c.value)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Our own B2B revenue ────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight">{t('revenue.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('revenue.subtitle')}</p>
        </div>
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('revenue.package')}</TableHead>
                <TableHead className="text-right">{t('revenue.sales')}</TableHead>
                <TableHead className="text-right">{t('revenue.units')}</TableHead>
                <TableHead className="text-right">{t('revenue.total')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">{t('empty')}</TableCell>
                </TableRow>
              ) : packages.map((p) => (
                <TableRow key={p.packageName}>
                  <TableCell className="font-medium">{p.packageName}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.sales}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.units}</TableCell>
                  <TableCell className="text-right tabular-nums">{usd.format(p.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">{t('revenue.caveat')}</p>
      </section>
    </div>
  )
}
