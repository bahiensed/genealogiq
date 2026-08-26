'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@genealogiq/ui/badge'
import { DataTableColumnHeader } from '@genealogiq/ui/data-table-column-header'
import { RowActions } from '@genealogiq/ui/row-actions'
import { togglePartnerPlanActive, syncPartnerPlan } from '@/actions/partner-plan.actions'

// Loose translator type so getColumns can stay a plain function (not a hook).
// The caller passes useTranslations('PartnerPlans').
type Translator = (key: string, values?: Record<string, string | number | Date>) => string

export interface PartnerPlanPriceRow {
  id: string
  currency: string
  annualCashAmount: number | null
  installmentCount: number | null
  installmentAmount: number | null
  unitReferenceAmount: number | null
  stripeCashPriceId: string | null
  stripeInstallmentPriceId: string | null
}

export interface PartnerPlanRow {
  id: string
  name: string
  code: string
  annualAllowance: number
  isActive: boolean
  version: number
  createdAt: Date
  prices: PartnerPlanPriceRow[]
  _count: { subscriptions: number }
}

function money(locale: string, currency: string, value: number | null): string {
  if (value === null) return '—'
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value)
}

function ActionsCell({ row, t }: { row: { original: PartnerPlanRow }; t: Translator }) {
  const plan = row.original
  return (
    <RowActions
      menuLabel={t('actions.openMenu')}
      items={[
        { kind: 'link', label: t('actions.edit'), href: `/plans/${plan.id}` },
        {
          kind: 'action',
          label: t('actions.sync'),
          run: () => syncPartnerPlan(plan.id),
          successMessage: t('toasts.synced'),
        },
        {
          kind: 'action',
          label: plan.isActive ? t('actions.deactivate') : t('actions.reactivate'),
          run: () => togglePartnerPlanActive(plan.id),
          successMessage: plan.isActive ? t('toasts.deactivated') : t('toasts.reactivated'),
        },
      ]}
    />
  )
}

export function getColumns(t: Translator, locale: string): ColumnDef<PartnerPlanRow>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.name')} />,
      cell: ({ row }) => (
        <div>
          <div>{row.original.name}</div>
          <div className="text-xs text-muted-foreground tabular-nums">{row.original.code}</div>
        </div>
      ),
    },
    {
      accessorKey: 'annualAllowance',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('table.allowance')} className="justify-end" />
      ),
      cell: ({ row }) => <div className="text-right tabular-nums">{row.original.annualAllowance}</div>,
    },
    {
      id: 'prices',
      // Sorted by the dollar amount, the one currency every plan is expected to
      // carry; the cell shows every currency the plan is actually priced in.
      accessorFn: (row) => row.prices.find((p) => p.currency === 'USD')?.annualCashAmount ?? 0,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('table.cash')} className="justify-end" />
      ),
      cell: ({ row }) => {
        if (row.original.prices.length === 0) {
          return <div className="text-right text-muted-foreground">—</div>
        }
        return (
          <div className="text-right tabular-nums">
            {row.original.prices.map((p) => (
              <div key={p.id}>{money(locale, p.currency, p.annualCashAmount)}</div>
            ))}
          </div>
        )
      },
    },
    {
      id: 'installments',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('table.installments')} className="justify-end" />
      ),
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {row.original.prices.map((p) => (
            <div key={p.id}>
              {p.installmentCount && p.installmentAmount
                ? `${p.installmentCount}× ${money(locale, p.currency, p.installmentAmount)}`
                : '—'}
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'unitReference',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('table.perGenCode')} className="justify-end" />
      ),
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {row.original.prices.map((p) => (
            <div key={p.id}>{money(locale, p.currency, p.unitReferenceAmount)}</div>
          ))}
        </div>
      ),
    },
    {
      id: 'synced',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.stripe')} />,
      // A plan is only sellable where its Stripe Price exists. Showing this per
      // row is what stops "why can nobody buy Árvore in pesos" being a mystery.
      cell: ({ row }) => {
        const total  = row.original.prices.length
        const synced = row.original.prices.filter((p) => p.stripeCashPriceId).length
        if (total === 0) return <Badge variant="outline">{t('sync.unpriced')}</Badge>
        if (synced === 0) return <Badge variant="destructive">{t('sync.none')}</Badge>
        if (synced < total) return <Badge variant="secondary">{t('sync.partial', { synced, total })}</Badge>
        return <Badge variant="default">{t('sync.all')}</Badge>
      },
    },
    {
      accessorKey: 'isActive',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.status')} />,
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge variant="default">{t('status.active')}</Badge>
        ) : (
          <Badge variant="destructive">{t('status.inactive')}</Badge>
        ),
    },
    {
      id: 'contracts',
      accessorFn: (row) => row._count.subscriptions,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('table.contracts')} className="justify-end" />
      ),
      cell: ({ row }) => <div className="text-right tabular-nums">{row.original._count.subscriptions}</div>,
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => <ActionsCell row={row} t={t} />,
    },
  ]
}
