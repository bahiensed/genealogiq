import { getTranslations, getLocale } from 'next-intl/server'
import { Card, CardContent, CardHeader, CardTitle } from '@genealogiq/ui/card'
import { Badge } from '@genealogiq/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@genealogiq/ui/table'
import type { PendingPlanOrder } from '@/queries/licenses'

/**
 * Surfaces plan purchases that were sent to this tenant but never paid —
 * otherwise the only sign anything happened is a stock count that never grew.
 */
export async function PendingPlanOrders({ orders }: { orders: PendingPlanOrder[] }) {
  if (orders.length === 0) return null

  const t = await getTranslations('Licenses.pendingOrders')
  const locale = await getLocale()
  const date = (d: Date) => new Intl.DateTimeFormat(locale, { dateStyle: 'short' }).format(d)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('table.plan')}</TableHead>
              <TableHead>{t('table.since')}</TableHead>
              <TableHead>{t('table.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <div>{order.plan.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {t('allowance', { count: order.plan.annualAllowance })}
                  </div>
                </TableCell>
                <TableCell className="tabular-nums">{date(order.createdAt)}</TableCell>
                <TableCell>
                  {order.linkExpired ? (
                    <Badge variant="destructive">{t('status.expired')}</Badge>
                  ) : (
                    <Badge className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                      {t('status.pending')}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
