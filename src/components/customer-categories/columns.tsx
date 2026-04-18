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
import { toggleCustomerCategoryActive, deleteCustomerCategory } from '@/actions/customer-category.actions'

export type CustomerCategoryRow = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: Date
}

function ActionsCell({ row, currentUserRole }: { row: { original: CustomerCategoryRow }; currentUserRole: string }) {
  const [isPending, startTransition] = useTransition()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const category = row.original

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
            <Link href={`/customer-categories/${category.id}`}>Edit</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => startTransition(async () => {
              const result = await toggleCustomerCategoryActive(category.id)
              if (result?.error) toast.error(result.error)
              else toast.success(category.isActive ? 'Category deactivated.' : 'Category reactivated.')
            })}
          >
            {category.isActive ? 'Deactivate' : 'Reactivate'}
          </DropdownMenuItem>
          {(currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'OWNER') && (
            <>
                  <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => setDeleteOpen(true)}
              >
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {(currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'OWNER') && (
        <ConfirmDeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          isPending={isPending}
          description={`The category "${category.name}" will be permanently deleted.`}
          onConfirm={() => startTransition(async () => {
            const result = await deleteCustomerCategory(category.id)
            if (result?.error) toast.error(result.error)
            else { toast.success('Category deleted successfully.'); setDeleteOpen(false) }
          })}
        />
      )}
    </>
  )
}

export function getColumns(currentUserRole: string): ColumnDef<CustomerCategoryRow>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => (
        <Link href={`/customer-categories/${row.original.id}`} className="hover:underline">
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: 'description',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
      cell: ({ row }) => row.original.description ?? '—',
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
      cell: ({ row }) => <ActionsCell row={row} currentUserRole={currentUserRole} />,
    },
  ]
}
