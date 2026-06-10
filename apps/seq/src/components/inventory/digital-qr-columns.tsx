'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@genealogiq/ui/badge'
import { DataTableColumnHeader } from '@genealogiq/ui/data-table-column-header'
import type { StatementRow } from '@/queries/digital-qr-statement'

const usd  = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const date = new Intl.DateTimeFormat('en-US', { dateStyle: 'short' })

export const digitalQrStatementColumns: ColumnDef<StatementRow>[] = [
  {
    accessorKey: 'date',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    cell: ({ row }) => date.format(row.original.date),
  },
  {
    accessorKey: 'description',
    header: ({ column }) => <DataTableColumnHeader column={column} title="QR Codes" />,
    cell: ({ row }) => (
      <span className={row.original.reversed ? 'text-muted-foreground line-through' : undefined}>
        {row.original.description}
        {row.original.reversed && (
          <Badge variant="outline" className="ml-2 align-middle text-[10px]">Reversed</Badge>
        )}
      </span>
    ),
  },
  {
    accessorKey: 'units',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Units" className="justify-end" />,
    cell: ({ row }) => {
      const n = row.original.units
      const cls = n > 0 ? 'text-emerald-600' : n < 0 ? 'text-destructive' : 'text-muted-foreground'
      return <div className={`text-right tabular-nums ${cls}`}>{n > 0 ? `+${n}` : n}</div>
    },
  },
  {
    accessorKey: 'unitPrice',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Unit Price" className="justify-end" />,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {row.original.unitPrice != null ? usd.format(row.original.unitPrice) : '—'}
      </div>
    ),
  },
  {
    accessorKey: 'balance',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Available" className="justify-end" />,
    cell: ({ row }) => <div className="text-right font-medium tabular-nums">{row.original.balance}</div>,
  },
]
