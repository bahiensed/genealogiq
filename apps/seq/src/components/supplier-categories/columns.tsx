'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@genealogiq/ui/badge'
import { DataTableColumnHeader } from '@genealogiq/ui/data-table-column-header'
import { RowActions } from '@genealogiq/ui/row-actions'
import { toggleSupplierCategoryActive, deleteSupplierCategory } from '@/actions/supplier-category.actions'

// Loose translator type so getColumns can stay a plain function (not a hook).
// The caller (supplier-categories-data-table) passes useTranslations('SupplierCategories').
type Translator = (key: string, values?: Record<string, string | number | Date>) => string

export type SupplierCategoryRow = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: Date
}

function ActionsCell({ row, t }: { row: { original: SupplierCategoryRow }; t: Translator }) {
  const category = row.original

  return (
    <RowActions
      menuLabel={t('actions.openMenu')}
      items={[
        { kind: 'link', label: t('actions.edit'), href: `/supplier-categories/${category.id}` },
        {
          kind: 'action',
          label: category.isActive ? t('actions.deactivate') : t('actions.reactivate'),
          run: () => toggleSupplierCategoryActive(category.id),
          successMessage: category.isActive ? t('toasts.deactivated') : t('toasts.reactivated'),
        },
      ]}
      remove={{
        label: t('actions.delete'),
        run: () => deleteSupplierCategory(category.id),
        confirmDescription: t('toasts.deleteConfirm', { name: category.name }),
        successMessage: t('toasts.deleted'),
      }}
    />
  )
}

export function getColumns(t: Translator, locale: string): ColumnDef<SupplierCategoryRow>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.name')} />,
      cell: ({ row }) => row.original.name,
    },
    {
      accessorKey: 'description',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.description')} />,
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
      cell: ({ row }) => <ActionsCell row={row} t={t} />,
    },
  ]
}
