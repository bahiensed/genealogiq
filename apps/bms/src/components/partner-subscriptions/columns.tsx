'use client'

import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@genealogiq/ui/badge'
import { DataTableColumnHeader } from '@genealogiq/ui/data-table-column-header'

type Translator = (key: string, values?: Record<string, string | number | Date>) => string

export interface ContractRow {
  id: string
  status: string
  autoRenew: boolean
  createdAt: Date
  amountPaid: number | null
  currency: string | null
  cadence: string | null
  tenant: { id: string; name: string; tradeName: string }
  plan: { id: string; name: string; code: string; annualAllowance: number }
  currentCycle: { id: string; startAt: Date; endAt: Date; graceEndAt: Date; status: string } | null
  _count: { cycles: number }
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default', PENDING: 'outline', PAST_DUE: 'secondary',
  EXPIRED: 'destructive', CANCELLED: 'destructive',
}

export function getColumns(t: Translator, locale: string): ColumnDef<ContractRow>[] {
  const date = (d: Date) => new Intl.DateTimeFormat(locale, { dateStyle: 'short' }).format(d)

  return [
    {
      id: 'tenant',
      accessorFn: (r) => r.tenant.tradeName || r.tenant.name,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.partner')} />,
      cell: ({ row }) => (
        <Link href={`/sales/contracts/${row.original.id}`} className="underline-offset-4 hover:underline">
          {row.original.tenant.tradeName || row.original.tenant.name}
        </Link>
      ),
    },
    {
      id: 'plan',
      accessorFn: (r) => r.plan.annualAllowance,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.plan')} />,
      cell: ({ row }) => (
        <div>
          <div>{row.original.plan.name}</div>
          <div className="text-xs text-muted-foreground tabular-nums">
            {t('table.allowanceValue', { count: row.original.plan.annualAllowance })}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.status')} />,
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status] ?? 'outline'}>
          {t(`status.${row.original.status}`)}
        </Badge>
      ),
    },
    {
      id: 'cycle',
      // A PENDING contract has no cycle: it is a link that was generated and
      // never paid. Saying so beats an empty cell.
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.cycle')} />,
      cell: ({ row }) => {
        const c = row.original.currentCycle
        if (!c) return <span className="text-muted-foreground">{t('table.noCycle')}</span>
        return (
          <div className="text-xs tabular-nums">
            <div>{date(c.startAt)} → {date(c.endAt)}</div>
            <div className="text-muted-foreground">{t('table.graceUntil', { date: date(c.graceEndAt) })}</div>
          </div>
        )
      },
    },
    {
      id: 'cycles',
      accessorFn: (r) => r._count.cycles,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.renewals')} className="justify-end" />,
      // Cycles minus the first: how many times they actually renewed, which is
      // the retention number rather than the contract count.
      cell: ({ row }) => <div className="text-right tabular-nums">{Math.max(0, row.original._count.cycles - 1)}</div>,
    },
    {
      id: 'amount',
      accessorFn: (r) => r.amountPaid ?? 0,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.amount')} className="justify-end" />,
      cell: ({ row }) => {
        const { amountPaid, currency, cadence } = row.original
        if (amountPaid == null || !currency) return <div className="text-right text-muted-foreground">—</div>
        return (
          <div className="text-right tabular-nums">
            <div>{new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amountPaid / 100)}</div>
            {cadence && <div className="text-xs text-muted-foreground">{t(`cadence.${cadence}`)}</div>}
          </div>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.since')} />,
      cell: ({ row }) => date(row.original.createdAt),
    },
  ]
}
