'use client'

import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@genealogiq/ui/button'
import { Badge } from '@genealogiq/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@genealogiq/ui/dropdown-menu'
import { DataTableColumnHeader } from '@genealogiq/ui/data-table-column-header'
import { ConfirmDeleteDialog } from '@genealogiq/ui/confirm-delete-dialog'
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

function ActionsCell({ row, currentUserRole, t }: { row: { original: SupplierCategoryRow }; currentUserRole: string; t: Translator }) {
  const [isPending, startTransition] = useTransition()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const category = row.original

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
            <Link href={`/categories/suppliers/${category.id}`}>{t('actions.edit')}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => startTransition(async () => {
              const result = await toggleSupplierCategoryActive(category.id)
              if (!result.ok) toast.error(result.message)
              else toast.success(category.isActive ? t('toasts.deactivated') : t('toasts.reactivated'))
            })}
          >
            {category.isActive ? t('actions.deactivate') : t('actions.reactivate')}
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
          description={t('toasts.deleteConfirm', { name: category.name })}
          onConfirm={() => startTransition(async () => {
            const result = await deleteSupplierCategory(category.id)
            if (!result.ok) toast.error(result.message)
            else { toast.success(t('toasts.deleted')); setDeleteOpen(false) }
          })}
        />
      )}
    </>
  )
}

export function getColumns(currentUserRole: string, t: Translator, locale: string): ColumnDef<SupplierCategoryRow>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.name')} />,
      cell: ({ row }) => (
        <Link href={`/categories/suppliers/${row.original.id}`} className="hover:underline">
          {row.original.name}
        </Link>
      ),
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
      cell: ({ row }) => <ActionsCell row={row} currentUserRole={currentUserRole} t={t} />,
    },
  ]
}
