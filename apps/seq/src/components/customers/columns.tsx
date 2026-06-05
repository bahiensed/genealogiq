'use client'

import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog'
import { toggleCustomerActive, deleteCustomer, resendCustomerEmail } from '@/actions/customer.actions'

export type CustomerRow = {
  id: string
  firstName: string
  lastName: string
  email: string | null
  isActive: boolean
  createdAt: Date
  category: { id: string; name: string } | null
}

function ActionsCell({ row }: { row: { original: CustomerRow } }) {
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
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/customers/${customer.id}`}>Edit</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => startTransition(async () => {
              const result = await toggleCustomerActive(customer.id)
              if (result?.error) toast.error(result.error)
              else toast.success(customer.isActive ? 'Customer deactivated.' : 'Customer reactivated.')
            })}
          >
            {customer.isActive ? 'Deactivate' : 'Reactivate'}
          </DropdownMenuItem>
          {customer.email && (
            <DropdownMenuItem
              onClick={() => startTransition(async () => {
                const result = await resendCustomerEmail(customer.id)
                if (result?.error) toast.error(result.error)
                else toast.success('Email resent successfully.')
              })}
            >
              Resend email
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        isPending={isPending}
        description={`The customer "${fullName}" will be permanently deleted.`}
        onConfirm={() => startTransition(async () => {
          const result = await deleteCustomer(customer.id)
          if (result?.error) toast.error(result.error)
          else { toast.success('Customer deleted successfully.'); setDeleteOpen(false) }
        })}
      />
    </>
  )
}

export const customerColumns: ColumnDef<CustomerRow>[] = [
  {
    id: 'name',
    accessorFn: (row) => `${row.firstName} ${row.lastName}`,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => (
      <Link href={`/customers/${row.original.id}`} className="hover:underline">
        {row.original.firstName} {row.original.lastName}
      </Link>
    ),
  },
  {
    id: 'category',
    accessorFn: (row) => row.category?.name ?? '',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
    cell: ({ row }) => row.original.category?.name ?? '—',
  },
  {
    accessorKey: 'email',
    header: ({ column }) => <DataTableColumnHeader column={column} title="E-mail" />,
    cell: ({ row }) => row.original.email ?? '—',
  },
  {
    accessorKey: 'isActive',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) =>
      row.original.isActive ? (
        <Badge variant="default">Active</Badge>
      ) : (
        <Badge variant="destructive">Inactive</Badge>
      ),
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created at" />,
    cell: ({ row }) =>
      new Intl.DateTimeFormat('en-US', { dateStyle: 'short' }).format(row.original.createdAt),
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => <ActionsCell row={row} />,
  },
]
