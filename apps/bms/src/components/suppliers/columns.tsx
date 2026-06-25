'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@genealogiq/ui/badge'
import { DataTableColumnHeader } from '@genealogiq/ui/data-table-column-header'
import { RowActions } from '@genealogiq/ui/row-actions'
import { toggleSupplierActive, deleteSupplier } from '@/actions/supplier.actions'

// Loose translator type so getColumns can stay a plain function (not a hook).
// The caller (suppliers-data-table) passes useTranslations('Suppliers').
type Translator = (key: string, values?: Record<string, string | number | Date>) => string

export type SupplierRow = {
  id: string
  entityType: string
  name: string
  tradeName: string
  email: string
  isActive: boolean
  createdAt: Date
  category: { id: string; name: string } | null
}

function ActionsCell({ row, currentUserRole, t }: { row: { original: SupplierRow }; currentUserRole: string; t: Translator }) {
  const supplier = row.original
  const canManage = currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'OWNER'

  return (
    <RowActions
      menuLabel={t('actions.openMenu')}
      items={[
        { kind: 'link', label: t('actions.edit'), href: `/suppliers/${supplier.id}` },
        {
          kind: 'action',
          label: supplier.isActive ? t('actions.deactivate') : t('actions.reactivate'),
          run: () => toggleSupplierActive(supplier.id),
          successMessage: supplier.isActive ? t('toasts.deactivated') : t('toasts.reactivated'),
        },
      ]}
      remove={canManage ? {
        label: t('actions.delete'),
        run: () => deleteSupplier(supplier.id),
        confirmDescription: t('toasts.deleteConfirm', { name: supplier.name }),
        successMessage: t('toasts.deleted'),
      } : undefined}
    />
  )
}

export function getColumns(currentUserRole: string, t: Translator, locale: string): ColumnDef<SupplierRow>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.name')} />,
      cell: ({ row }) => row.original.name,
    },
    {
      accessorKey: 'entityType',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.type')} />,
      cell: ({ row }) =>
        row.original.entityType === 'INDIVIDUAL' ? t('entityType.individual') : t('entityType.company'),
    },
    {
      id: 'category',
      accessorFn: (row) => row.category?.name ?? '',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.category')} />,
      cell: ({ row }) => row.original.category?.name ?? '—',
    },
    {
      accessorKey: 'email',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.email')} />,
      cell: ({ row }) => row.original.email,
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
