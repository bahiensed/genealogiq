import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { verifySession } from '@/lib/dal'
import { getPartnerSubscription } from '@/queries/partner-subscriptions'
import { Card, CardContent, CardHeader, CardTitle } from '@genealogiq/ui/card'
import { Badge } from '@genealogiq/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@genealogiq/ui/table'

interface Props { params: Promise<{ id: string }> }

function snapshotField(snapshot: unknown, key: string): string | null {
  if (!snapshot || typeof snapshot !== 'object') return null
  const v = (snapshot as Record<string, unknown>)[key]
  return typeof v === 'string' || typeof v === 'number' ? String(v) : null
}

// One contract, and every cycle it has been through.
//
// The cycle list is the point: a contract is not one purchase but a chain of
// renewals, and what each was charged is frozen on the cycle itself — so this
// keeps answering "what did they actually pay in 2027" long after the price
// book moved on.
export default async function ContractDetailPage({ params }: Props) {
  const { id } = await params
  await verifySession()

  const [contract, t, locale] = await Promise.all([
    getPartnerSubscription(id),
    getTranslations('Contracts'),
    getLocale(),
  ])
  if (!contract) notFound()

  const date = (d: Date) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(d)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
            {contract.tenant.tradeName || contract.tenant.name}
          </h1>
          <p className="text-muted-foreground mt-2">
            {contract.plan.name} · {t('table.allowanceValue', { count: contract.plan.annualAllowance })}
          </p>
        </div>
        <Badge variant={contract.status === 'ACTIVE' ? 'default' : 'destructive'}>
          {t(`status.${contract.status}`)}
        </Badge>
      </div>

      {contract.founderRolloverEligible && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('detail.founder')}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {contract.founderRolloverUsed ? t('detail.founderUsed') : t('detail.founderAvailable')}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-lg">{t('detail.cycles')}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('detail.period')}</TableHead>
                <TableHead>{t('detail.grace')}</TableHead>
                <TableHead>{t('table.status')}</TableHead>
                <TableHead className="text-right">{t('table.amount')}</TableHead>
                <TableHead>{t('detail.origin')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contract.cycles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {t('table.noCycle')}
                  </TableCell>
                </TableRow>
              ) : contract.cycles.map((c) => {
                const amount   = snapshotField(c.priceSnapshot, 'amountPaid')
                const currency = snapshotField(c.priceSnapshot, 'currency')
                const cadence  = snapshotField(c.priceSnapshot, 'cadence')
                return (
                  <TableRow key={c.id}>
                    <TableCell className="tabular-nums">{date(c.startAt)} → {date(c.endAt)}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{date(c.graceEndAt)}</TableCell>
                    <TableCell>{t(`cycleStatus.${c.status}`)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {amount && currency
                        ? new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(amount) / 100)
                        : '—'}
                      {cadence && <div className="text-xs text-muted-foreground">{t(`cadence.${cadence}`)}</div>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.renewedFromCycleId ? t('detail.renewal') : t('detail.first')}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
