'use client'

import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@genealogiq/ui/button'
import { Badge } from '@genealogiq/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@genealogiq/ui/dropdown-menu'
import { DataTableColumnHeader } from '@genealogiq/ui/data-table-column-header'
import { ConfirmDeleteDialog } from '@genealogiq/ui/confirm-delete-dialog'
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
  type: 'DIGITAL' | 'PHYSICAL'
  createdAt: Date
}

function ActionsCell({ row, currentUserRole, basePath, t }: { row: { original: PackageRow }; currentUserRole: string; basePath: string; t: Translator }) {
  const [isPending, startTransition] = useTransition()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const pkg = row.original

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isPending}>
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">{t('actions.openMenu')}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`${basePath}/${pkg.id}`}>{t('actions.edit')}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => startTransition(async () => {
              const result = await togglePackageActive(pkg.id)
              if (result?.error) toast.error(result.error)
              else toast.success(pkg.isActive ? t('toasts.deactivated') : t('toasts.reactivated'))
            })}
          >
            {pkg.isActive ? t('actions.deactivate') : t('actions.reactivate')}
          </DropdownMenuItem>
          {(currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'OWNER') && (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setDeleteOpen(true)}
            >
              {t('actions.delete')}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {(currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'OWNER') && (
        <ConfirmDeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          isPending={isPending}
          description={t('toasts.deleteConfirm', { name: pkg.name })}
          onConfirm={() => startTransition(async () => {
            const result = await deletePackage(pkg.id)
            if (result?.error) toast.error(result.error)
            else { toast.success(t('toasts.deleted')); setDeleteOpen(false) }
          })}
        />
      )}
    </>
  )
}

export function getColumns(currentUserRole: string, t: Translator, locale: string, basePath = '/packages', noun: 'package' | 'product' = 'package'): ColumnDef<PackageRow>[] {
  const Noun = noun === 'product' ? t('noun.product') : t('noun.package')
  const usd = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' })
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.name', { noun: Noun })} />,
      cell: ({ row }) => (
        <Link href={`${basePath}/${row.original.id}`} className="hover:underline">
          {row.original.name}
        </Link>
      ),
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
