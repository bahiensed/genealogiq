'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@genealogiq/ui/badge'
import { DataTableColumnHeader } from '@genealogiq/ui/data-table-column-header'
import { RowActions } from '@genealogiq/ui/row-actions'
import { togglePackageActive, deletePackage } from '@/actions/package.actions'

// Loose translator type so getColumns can stay a plain function (not a hook).
// The caller (packages-data-table) passes useTranslations('Packages').
type Translator = (key: string, values?: Record<string, string | number | Date>) => string

export type PackageRow = {
  id: string
  name: string
  description: string | null
  price: number
  quantity: number
  isActive: boolean
  createdAt: Date
}

function ActionsCell({ row, currentUserRole, basePath, t }: { row: { original: PackageRow }; currentUserRole: string; basePath: string; t: Translator }) {
  const pkg = row.original
  const canManage = currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'OWNER'

  return (
    <RowActions
      menuLabel={t('actions.openMenu')}
      items={[
        { kind: 'link', label: t('actions.edit'), href: `${basePath}/${pkg.id}` },
        {
          kind: 'action',
          label: pkg.isActive ? t('actions.deactivate') : t('actions.reactivate'),
          run: () => togglePackageActive(pkg.id),
          successMessage: pkg.isActive ? t('toasts.deactivated') : t('toasts.reactivated'),
        },
      ]}
      remove={canManage ? {
        label: t('actions.delete'),
        run: () => deletePackage(pkg.id),
        confirmDescription: t('toasts.deleteConfirm', { name: pkg.name }),
        successMessage: t('toasts.deleted'),
      } : undefined}
    />
  )
}

export function getColumns(currentUserRole: string, t: Translator, locale: string, basePath = '/physical-qr'): ColumnDef<PackageRow>[] {
  const Noun = t('noun.product')
  const usd = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' })
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.name', { noun: Noun })} />,
      cell: ({ row }) => row.original.name,
    },
    {
      accessorKey: 'quantity',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.quantity')} className="justify-end" />,
      cell: ({ row }) => <div className="text-right">{row.original.quantity}</div>,
    },
    {
      accessorKey: 'price',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.price', { noun: Noun })} className="justify-end" />,
      cell: ({ row }) => <div className="text-right">{usd.format(row.original.price)}</div>,
    },
    {
      accessorKey: 'description',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.description', { noun: Noun })} />,
      cell: ({ row }) => row.original.description ?? '—',
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
      cell: ({ row }) => <ActionsCell row={row} currentUserRole={currentUserRole} basePath={basePath} t={t} />,
    },
  ]
}
