'use client'

import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog'
import { toggleLicenseActive, deleteLicense } from '@/actions/license.actions'

export type LicenseRow = {
  id: string
  component: string
  description: string | null
  isActive: boolean
  createdAt: Date
}

function ActionsCell({ row, currentUserRole }: { row: { original: LicenseRow }; currentUserRole: string }) {
  const [isPending, startTransition] = useTransition()
  const license = row.original

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isPending}>
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/licenses/${license.id}`}>Edit</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => startTransition(async () => {
            const result = await toggleLicenseActive(license.id)
            if (result?.error) toast.error(result.error)
            else toast.success(license.isActive ? 'License deactivated.' : 'License reactivated.')
          })}
        >
          {license.isActive ? 'Deactivate' : 'Reactivate'}
        </DropdownMenuItem>
        {(currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'OWNER') && (
          <>
            <DropdownMenuSeparator />
            <ConfirmDeleteDialog
              isPending={isPending}
              description={`The license "${license.component}" will be permanently deleted.`}
              onConfirm={() => startTransition(async () => {
                const result = await deleteLicense(license.id)
                if (result?.error) toast.error(result.error)
                else toast.success('License deleted successfully.')
              })}
            />
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function getColumns(currentUserRole: string): ColumnDef<LicenseRow>[] {
  return [
    {
      accessorKey: 'component',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Component" />,
      cell: ({ row }) => (
        <Link href={`/licenses/${row.original.id}`} className="hover:underline">
          {row.original.component}
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
