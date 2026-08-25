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
  priceUsd: number | null
  priceBrl: number | null
  priceMxn: number | null
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

export function getColumns(currentUserRole: string, t: Translator, locale: string, basePath = '/gencodes'): ColumnDef<PackageRow>[] {
  const Noun = t('noun.product')
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
      id: 'price',
      // Sorted by the dollar price, which every product historically had; the
      // cell shows every currency the product is actually sold in.
      accessorFn: (row) => row.priceUsd ?? 0,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.price', { noun: Noun })} className="justify-end" />,
      cell: ({ row }) => {
        const priced = ([
          ['USD', row.original.priceUsd],
          ['BRL', row.original.priceBrl],
          ['MXN', row.original.priceMxn],
        ] as const).filter(([, v]) => v !== null && v > 0)
        if (priced.length === 0) return <div className="text-right text-muted-foreground">—</div>
        return (
          <div className="text-right tabular-nums">
            {priced.map(([code, value]) => (
              <div key={code}>
                {new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(value!)}
              </div>
            ))}
          </div>
        )
      },
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
