'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@genealogiq/ui/badge'
import { DataTableColumnHeader } from '@genealogiq/ui/data-table-column-header'
import { RowActions } from '@genealogiq/ui/row-actions'
import { reverseSale } from '@/actions/sale.actions'

// Loose translator type so getColumns can stay a plain function (not a hook).
// The caller (sales-data-table) passes useTranslations('Sales').
type Translator = (key: string, values?: Record<string, string | number | Date>) => string

export type SaleRow = {
  id: number
  quantity: number
  reversedAt: Date | null
  createdAt: Date
  package:  { name: string; price: number; quantity: number }
  tenant:   { name: string }
  soldBy:   { firstName: string; lastName: string }
}

function ActionsCell({ row, currentUserRole, t }: { row: { original: SaleRow }; currentUserRole: string; t: Translator }) {
  const sale = row.original
  const canManage = currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'OWNER'

  // Sales are immutable: the only action is a confirm-guarded reverse, and it's
  // unavailable once already reversed. With no other items, render nothing.
  if (!canManage || sale.reversedAt) return null

  return (
    <RowActions
      menuLabel={t('actions.openMenu')}
      items={[]}
      remove={{
        label: t('actions.reverse'),
        run: () => reverseSale(sale.id),
        confirmDescription: t('reverse.description', { product: sale.package.name, customer: sale.tenant.name }),
        successMessage: t('toasts.reversed'),
      }}
    />
  )
}

export function getColumns(currentUserRole: string, t: Translator, locale: string): ColumnDef<SaleRow>[] {
  const currency = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' })
  const date     = new Intl.DateTimeFormat(locale, { dateStyle: 'short' })

  return [
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.date')} />,
      cell: ({ row }) => (
        <span className={row.original.reversedAt ? 'opacity-40' : ''}>
          {date.format(new Date(row.original.createdAt))}
        </span>
      ),
    },
    {
      id: 'status',
      header: t('table.status'),
      cell: ({ row }) =>
        row.original.reversedAt ? (
          <Badge variant="outline" className="text-muted-foreground">
            {t('status.reversed')}
          </Badge>
        ) : (
          <Badge variant="default">{t('status.active')}</Badge>
        ),
    },
    {
      id: 'customer',
      accessorFn: (row) => row.tenant.name,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.customer')} />,
      cell: ({ row }) => (
        <span className={row.original.reversedAt ? 'opacity-40 line-through' : ''}>
          {row.original.tenant.name}
        </span>
      ),
    },
    {
      id: 'product',
      accessorFn: (row) => row.package.name,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.product')} />,
      cell: ({ row }) => (
        <span className={row.original.reversedAt ? 'opacity-40' : ''}>
          {row.original.package.name}
        </span>
      ),
    },
    {
      accessorKey: 'quantity',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.quantity')} />,
      cell: ({ row }) => (
        <div className={`text-right ${row.original.reversedAt ? 'opacity-40' : ''}`}>
          {row.original.quantity}
        </div>
      ),
    },
    {
      id: 'totalUnits',
      accessorFn: (row) => row.quantity * row.package.quantity,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.totalUnits')} />,
      cell: ({ row }) => (
        <div className={`text-right ${row.original.reversedAt ? 'opacity-40' : ''}`}>
          {(row.original.quantity * row.original.package.quantity).toLocaleString(locale)}
        </div>
      ),
    },
    {
      id: 'productPrice',
      accessorFn: (row) => row.package.price,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.productPrice')} />,
      cell: ({ row }) => (
        <div className={`text-right ${row.original.reversedAt ? 'opacity-40' : ''}`}>
          {currency.format(row.original.package.price)}
        </div>
      ),
    },
    {
      id: 'unitPrice',
      accessorFn: (row) => row.package.price / row.package.quantity,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.unitPrice')} />,
      cell: ({ row }) => (
        <div className={`text-right ${row.original.reversedAt ? 'opacity-40' : ''}`}>
          {currency.format(row.original.package.price / row.original.package.quantity)}
        </div>
      ),
    },
    {
      id: 'totalPrice',
      accessorFn: (row) => row.quantity * row.package.price,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.totalPrice')} />,
      cell: ({ row }) => (
        <div className={`text-right ${row.original.reversedAt ? 'opacity-40' : ''}`}>
          {currency.format(row.original.quantity * row.original.package.price)}
        </div>
      ),
    },
    {
      id: 'seller',
      accessorFn: (row) => `${row.soldBy.firstName} ${row.soldBy.lastName}`,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.seller')} />,
      cell: ({ row }) => (
        <div className={`flex flex-col leading-tight ${row.original.reversedAt ? 'opacity-40' : ''}`}>
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
