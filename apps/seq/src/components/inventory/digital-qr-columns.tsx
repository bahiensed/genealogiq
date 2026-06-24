'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@genealogiq/ui/badge'
import { DataTableColumnHeader } from '@genealogiq/ui/data-table-column-header'
import type { StatementRow } from '@/queries/digital-qr-statement'

// Loose translator type so getColumns can stay a plain function (not a hook).
// The caller (digital-qr-statement-table) passes useTranslations('Inventory').
type Translator = (key: string, values?: Record<string, string | number | Date>) => string

export function getColumns(t: Translator, locale: string): ColumnDef<StatementRow>[] {
  const usd  = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' })
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'short' })

  return [
    {
      accessorKey: 'date',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('digital.table.date')} />,
      cell: ({ row }) => date.format(row.original.date),
    },
    {
      accessorKey: 'description',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('digital.table.description')} />,
      cell: ({ row }) => (
        <span className={row.original.reversed ? 'text-muted-foreground line-through' : undefined}>
          {row.original.description}
          {row.original.reversed && (
            <Badge variant="outline" className="ml-2 align-middle text-[10px]">{t('digital.reversed')}</Badge>
          )}
        </span>
      ),
    },
    {
      accessorKey: 'units',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('digital.table.units')} className="justify-end" />,
      cell: ({ row }) => {
        const n = row.original.units
        const cls = n > 0 ? 'text-emerald-600' : n < 0 ? 'text-destructive' : 'text-muted-foreground'
        return <div className={`text-right tabular-nums ${cls}`}>{n > 0 ? `+${n}` : n}</div>
      },
    },
    {
      accessorKey: 'unitPrice',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('digital.table.unitPrice')} className="justify-end" />,
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {row.original.unitPrice != null ? usd.format(row.original.unitPrice) : '—'}
        </div>
      ),
    },
    {
      accessorKey: 'totalPrice',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('digital.table.totalPrice')} className="justify-end" />,
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {row.original.totalPrice != null ? usd.format(row.original.totalPrice) : '—'}
        </div>
      ),
    },
    {
      accessorKey: 'balance',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('digital.table.balance')} className="justify-end" />,
      cell: ({ row }) => <div className="text-right font-medium tabular-nums">{row.original.balance}</div>,
    },
  ]
}
