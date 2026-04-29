'use client'

import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog'
import { togglePackageActive, deletePackage } from '@/actions/package.actions'

export type PackageRow = {
  id: string
  name: string
  description: string | null
  price: number
  quantity: number
  isActive: boolean
  createdAt: Date
}

function ActionsCell({ row, currentUserRole }: { row: { original: PackageRow }; currentUserRole: string }) {
  const [isPending, startTransition] = useTransition()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const pkg = row.original

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
            <Link href={`/packages/${pkg.id}`}>Edit</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => startTransition(async () => {
              const result = await togglePackageActive(pkg.id)
              if (result?.error) toast.error(result.error)
              else toast.success(pkg.isActive ? 'Package deactivated.' : 'Package reactivated.')
            })}
          >
            {pkg.isActive ? 'Deactivate' : 'Reactivate'}
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
          description={`The package "${pkg.name}" will be permanently deleted.`}
          onConfirm={() => startTransition(async () => {
            const result = await deletePackage(pkg.id)
            if (result?.error) toast.error(result.error)
            else { toast.success('Package deleted successfully.'); setDeleteOpen(false) }
          })}
        />
      )}
    </>
  )
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function getColumns(currentUserRole: string): ColumnDef<PackageRow>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title={<>Package<br/>Name</>} />,
      cell: ({ row }) => (
        <Link href={`/packages/${row.original.id}`} className="hover:underline">
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: 'quantity',
      header: ({ column }) => <DataTableColumnHeader column={column} title={<>QR-Codes /<br/>Package</>} className="justify-end" />,
      cell: ({ row }) => <div className="text-right">{row.original.quantity}</div>,
    },
    {
      accessorKey: 'price',
      header: ({ column }) => <DataTableColumnHeader column={column} title={<>Package<br/>Price</>} className="justify-end" />,
      cell: ({ row }) => <div className="text-right">{usd.format(row.original.price)}</div>,
    },
    {
      accessorKey: 'description',
      header: ({ column }) => <DataTableColumnHeader column={column} title={<>Package Description</>} />,
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
    },    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => <ActionsCell row={row} currentUserRole={currentUserRole} />,
    },
  ]
}
