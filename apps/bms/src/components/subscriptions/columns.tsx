'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@genealogiq/ui/badge'
import { DataTableColumnHeader } from '@genealogiq/ui/data-table-column-header'
import { RowActions } from '@genealogiq/ui/row-actions'
import { toggleSubscriptionActive, deleteSubscription } from '@/actions/subscription.actions'

// Loose translator type so getColumns can stay a plain function (not a hook).
// The caller (subscriptions-data-table) passes useTranslations('Subscriptions').
type Translator = (key: string, values?: Record<string, string | number | Date>) => string

export type SubscriptionRow = {
  id: string
  code: string
  name: string
  description: string | null
  maxProfiles: number
  termLength: number
  priceUsd: number
  isActive: boolean
  createdAt: Date
}

function ActionsCell({ row, currentUserRole, t }: { row: { original: SubscriptionRow }; currentUserRole: string; t: Translator }) {
  const subscription = row.original
  const canManage = currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'OWNER'

  return (
    <RowActions
      menuLabel={t('actions.openMenu')}
      items={[
        { kind: 'link', label: t('actions.edit'), href: `/subscriptions/${subscription.id}` },
        {
          kind: 'action',
          label: subscription.isActive ? t('actions.deactivate') : t('actions.reactivate'),
          run: () => toggleSubscriptionActive(subscription.id),
          successMessage: subscription.isActive ? t('toasts.deactivated') : t('toasts.reactivated'),
        },
      ]}
      remove={canManage ? {
        label: t('actions.delete'),
        run: () => deleteSubscription(subscription.id),
        confirmDescription: t('toasts.deleteConfirm', { name: subscription.name }),
        successMessage: t('toasts.deleted'),
      } : undefined}
    />
  )
}

export function getColumns(currentUserRole: string, t: Translator, locale: string): ColumnDef<SubscriptionRow>[] {
  const currency = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' })

  return [
    {
      accessorKey: 'code',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.code')} />,
      cell: ({ row }) => (
        <code className="text-xs font-mono bg-muted/60 px-1.5 py-0.5 rounded">{row.original.code}</code>
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.name')} />,
      cell: ({ row }) => row.original.name,
    },
    {
      accessorKey: 'maxProfiles',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.maxProfiles')} className="justify-end" />,
      cell: ({ row }) => <div className="text-right">{row.original.maxProfiles}</div>,
    },
    {
      accessorKey: 'termLength',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.term')} className="justify-end" />,
      cell: ({ row }) => (
        <div className="text-right">
          {row.original.termLength === 0 ? <span title={t('lifetime')} className="text-base leading-none">∞</span> : row.original.termLength}
        </div>
      ),
    },
    {
      accessorKey: 'priceUsd',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.price')} className="justify-end" />,
      cell: ({ row }) => (
        <div className="text-right">
          {row.original.priceUsd === 0 ? t('free') : currency.format(row.original.priceUsd)}
        </div>
      ),
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
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.createdAt')} />,
      cell: ({ row }) =>
        new Intl.DateTimeFormat(locale, { dateStyle: 'short' }).format(row.original.createdAt),
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => <ActionsCell row={row} currentUserRole={currentUserRole} t={t} />,
    },
  ]
}
