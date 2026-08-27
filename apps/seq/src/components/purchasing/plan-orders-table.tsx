import { getTranslations, getLocale } from 'next-intl/server'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@genealogiq/ui/table'
import type { PlanOrder } from '@/queries/purchasing'

/**
 * The tenant's full order history — paid, pending, or dead — not just the
 * pending ones. A partner who bought a plan a year ago wants to see it here
 * too, not just the checkout links still hanging.
 */
export async function PlanOrdersTable({ orders }: { orders: PlanOrder[] }) {
  const t = await getTranslations('Purchasing')
  const locale = await getLocale()
  const date = (d: Date) => new Intl.DateTimeFormat(locale, { dateStyle: 'short' }).format(d)

  if (orders.length === 0) {
    return <p className="text-muted-foreground">{t('ordersTable.empty')}</p>
  }

  function statusLabel(order: PlanOrder): string {
    switch (order.status) {
      case 'ACTIVE':    return order.currentCycle
        ? t('ordersTable.status.active', { date: date(order.currentCycle.startAt) })
        : t('ordersTable.status.active', { date: date(order.createdAt) })
      case 'PENDING':   return order.linkExpired
        ? t('ordersTable.status.linkExpired')
        : t('ordersTable.status.pending')
      case 'PAST_DUE':  return t('ordersTable.status.pastDue')
      case 'EXPIRED':   return t('ordersTable.status.expired')
      case 'CANCELLED': return t('ordersTable.status.cancelled')
      default:          return order.status
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('ordersTable.table.plan')}</TableHead>
          <TableHead>{t('ordersTable.table.requestedAt')}</TableHead>
          <TableHead>{t('ordersTable.table.status')}</TableHead>
          <TableHead>{t('ordersTable.table.dueDate')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell>{order.plan.name}</TableCell>
            <TableCell className="tabular-nums">{date(order.createdAt)}</TableCell>
            <TableCell>{statusLabel(order)}</TableCell>
            <TableCell className="tabular-nums">
              {order.currentCycle ? date(order.currentCycle.endAt) : <span className="text-muted-foreground">—</span>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
