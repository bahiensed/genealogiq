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
import { toggleCustomerActive, deleteCustomer, resendCustomerEmail } from '@/actions/customer.actions'

// Loose translator type so getColumns can stay a plain function (not a hook).
// The caller (customers-data-table) passes useTranslations('Customers').
type Translator = (key: string, values?: Record<string, string | number | Date>) => string

export type CustomerRow = {
  id: string
  firstName: string
  lastName: string
  email: string | null
  isActive: boolean
  createdAt: Date
  category: { id: string; name: string } | null
}

function ActionsCell({ row, t }: { row: { original: CustomerRow }; t: Translator }) {
  const [isPending, startTransition] = useTransition()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const customer = row.original
  const fullName = `${customer.firstName} ${customer.lastName}`

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
            <Link href={`/customers/${customer.id}`}>{t('actions.edit')}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => startTransition(async () => {
              const result = await toggleCustomerActive(customer.id)
              if (result?.error) toast.error(result.error)
              else toast.success(customer.isActive ? t('toasts.deactivated') : t('toasts.reactivated'))
            })}
          >
            {customer.isActive ? t('actions.deactivate') : t('actions.reactivate')}
          </DropdownMenuItem>
          {customer.email && (
            <DropdownMenuItem
              onClick={() => startTransition(async () => {
                const result = await resendCustomerEmail(customer.id)
                if (result?.error) toast.error(result.error)
                else toast.success(t('toasts.emailResent'))
              })}
            >
              {t('actions.resendEmail')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            {t('actions.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        isPending={isPending}
        description={t('toasts.deleteConfirm', { name: fullName })}
        onConfirm={() => startTransition(async () => {
          const result = await deleteCustomer(customer.id)
          if (result?.error) toast.error(result.error)
          else { toast.success(t('toasts.deleted')); setDeleteOpen(false) }
        })}
      />
    </>
  )
}

export function getColumns(t: Translator, locale: string): ColumnDef<CustomerRow>[] {
  return [
    {
      id: 'name',
      accessorFn: (row) => `${row.firstName} ${row.lastName}`,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.name')} />,
      cell: ({ row }) => (
        <Link href={`/customers/${row.original.id}`} className="hover:underline">
          {row.original.firstName} {row.original.lastName}
        </Link>
      ),
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
      cell: ({ row }) => row.original.email ?? '—',
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
