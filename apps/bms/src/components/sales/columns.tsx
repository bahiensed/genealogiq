'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@genealogiq/ui/badge'
import { DataTableColumnHeader } from '@genealogiq/ui/data-table-column-header'
import { RowActions } from '@genealogiq/ui/row-actions'
import { reverseSale, markSalePaidManually, resendSaleCharge } from '@/actions/sale.actions'
import { saleState, isSaleDimmed } from '@/lib/sale-state'

// Loose translator type so getColumns can stay a plain function (not a hook).
// The caller (sales-data-table) passes useTranslations('Sales').
type Translator = (key: string, values?: Record<string, string | number | Date>) => string

export type SaleRow = {
  id: number
  quantity: number
  paidAt: Date | null
  expiredAt: Date | null
  failedAt: Date | null
  reversedAt: Date | null
  createdAt: Date
  amountTotal: number | null
  currency: string | null
  checkoutUrl: string | null
  discountCoupon: { code: string } | null
  package:  { name: string; quantity: number }
  tenant:   { name: string }
  soldBy:   { firstName: string; lastName: string }
}

function ActionsCell({ row, currentUserRole, t }: { row: { original: SaleRow }; currentUserRole: string; t: Translator }) {
  const sale = row.original
  const canManage = currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'OWNER'
  const state = saleState(sale)

  if (!canManage) return null

  // What you can do depends on where the money is. Copying the link is the one
  // thing worth offering while it is still live — reversing an unpaid sale would
  // mean unwinding nothing, and reversing a dead one even less.
  const items = []

  if (state === 'awaiting' && sale.checkoutUrl) {
    items.push({
      kind: 'action' as const,
      label: t('actions.copyLink'),
      // RowActions toasts whatever this resolves to, so the copy reports itself
      // the same way a server action would.
      run: async () => {
        await navigator.clipboard.writeText(sale.checkoutUrl!)
        return { ok: true, message: t('toasts.linkCopied') }
      },
    })
  }

  // One action for "the customer has not paid, chase them" — it re-sends a live
  // link and replaces a dead one, so the operator never has to know which it is.
  if (state !== 'paid' && state !== 'reversed') {
    items.push({
      kind: 'action' as const,
      label: t('actions.resendCharge'),
      run: () => resendSaleCharge(sale.id),
    })
  }

  // The escape hatch for money that arrived outside Stripe — a transfer, a PIX.
  // Offered on any unsettled sale, including a dead link: a customer who paid by
  // transfer after the link expired still bought the thing.
  if (state !== 'paid' && state !== 'reversed') {
    items.push({
      kind: 'action' as const,
      label: t('actions.markPaid'),
      run: () => markSalePaidManually(sale.id),
    })
  }

  // Reversal exists to undo a settled sale: mark it reversed and destroy the
  // unsold codes. Before payment there are no codes and no money, so the menu
  // would be offering to undo nothing.
  const remove = state === 'paid'
    ? {
        label: t('actions.reverse'),
        run: () => reverseSale(sale.id),
        confirmDescription: t('reverse.description', { product: sale.package.name, customer: sale.tenant.name }),
        successMessage: t('toasts.reversed'),
      }
    : undefined

  if (items.length === 0 && !remove) return null

  return <RowActions menuLabel={t('actions.openMenu')} items={items} remove={remove} />
}

/** Cents in the currency Stripe charged. Null until a session exists. */
function money(cents: number | null, currency: string | null, locale: string): string {
  if (cents === null) return '—'
  return new Intl.NumberFormat(locale, {
    style:    'currency',
    currency: (currency ?? 'usd').toUpperCase(),
  }).format(cents / 100)
}

export function getColumns(currentUserRole: string, t: Translator, locale: string): ColumnDef<SaleRow>[] {
  const date     = new Intl.DateTimeFormat(locale, { dateStyle: 'short' })

  return [
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.date')} />,
      cell: ({ row }) => (
        <span className={isSaleDimmed(row.original) ? 'opacity-40' : ''}>
          {date.format(new Date(row.original.createdAt))}
        </span>
      ),
    },
    {
      id: 'status',
      accessorFn: (row) => saleState(row),
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.status')} />,
      cell: ({ row }) => {
        const state = saleState(row.original)
        if (state === 'reversed') {
          return <Badge variant="outline" className="text-muted-foreground">{t('status.reversed')}</Badge>
        }
        if (state === 'paid') {
          return <Badge variant="default">{t('status.active')}</Badge>
        }
        if (state === 'failed') {
          return <Badge variant="outline" className="border-amber-500/50 text-amber-600">{t('status.failed')}</Badge>
        }
        if (state === 'expired') {
          return <Badge variant="outline" className="text-muted-foreground">{t('status.expired')}</Badge>
        }
        return <Badge variant="destructive">{t('status.awaitingPayment')}</Badge>
      },
    },
    {
      id: 'customer',
      accessorFn: (row) => row.tenant.name,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.customer')} />,
      cell: ({ row }) => (
        <span className={isSaleDimmed(row.original) ? 'opacity-40 line-through' : ''}>
          {row.original.tenant.name}
        </span>
      ),
    },
    {
      id: 'product',
      accessorFn: (row) => row.package.name,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.product')} />,
      cell: ({ row }) => (
        <span className={isSaleDimmed(row.original) ? 'opacity-40' : ''}>
          {row.original.package.name}
        </span>
      ),
    },
    {
      accessorKey: 'quantity',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.quantity')} />,
      cell: ({ row }) => (
        <div className={`text-right ${isSaleDimmed(row.original) ? 'opacity-40' : ''}`}>
          {row.original.quantity}
        </div>
      ),
    },
    {
      id: 'totalUnits',
      accessorFn: (row) => row.quantity * row.package.quantity,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.totalUnits')} />,
      cell: ({ row }) => (
        <div className={`text-right ${isSaleDimmed(row.original) ? 'opacity-40' : ''}`}>
          {(row.original.quantity * row.original.package.quantity).toLocaleString(locale)}
        </div>
      ),
    },
    {
      id: 'totalPrice',
      // The amount Stripe actually charged, in the currency it charged. Not
      // derived from the catalogue: the product now has three prices, the sale
      // has one, and a coupon means they differ on purpose.
      accessorFn: (row) => row.amountTotal ?? 0,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.totalPrice')} />,
      cell: ({ row }) => (
        <div className={`text-right tabular-nums ${isSaleDimmed(row.original) ? 'opacity-40' : ''}`}>
          {money(row.original.amountTotal, row.original.currency, locale)}
          {row.original.discountCoupon && (
            <span className="block text-xs text-emerald-600">{row.original.discountCoupon.code}</span>
          )}
        </div>
      ),
    },
    {
      id: 'unitPrice',
      accessorFn: (row) =>
        row.amountTotal === null ? 0 : row.amountTotal / (row.quantity * row.package.quantity),
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.unitPrice')} />,
      cell: ({ row }) => {
        const units = row.original.quantity * row.original.package.quantity
        const per   = row.original.amountTotal === null || units === 0
          ? null
          : row.original.amountTotal / units
        return (
          <div className={`text-right tabular-nums ${isSaleDimmed(row.original) ? 'opacity-40' : ''}`}>
            {money(per, row.original.currency, locale)}
          </div>
        )
      },
    },
    {
      id: 'seller',
      accessorFn: (row) => `${row.soldBy.firstName} ${row.soldBy.lastName}`,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.seller')} />,
      cell: ({ row }) => (
        <div className={`flex flex-col leading-tight ${isSaleDimmed(row.original) ? 'opacity-40' : ''}`}>
          <span>{row.original.soldBy.firstName}</span>
          <span>{row.original.soldBy.lastName}</span>
        </div>
      ),
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => <ActionsCell row={row} currentUserRole={currentUserRole} t={t} />,
    },
  ]
}
