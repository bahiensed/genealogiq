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
import { toggleUserActive, deleteUser, resendWelcomeEmail } from '@/actions/user.actions'

export type UserRow = {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  isActive: boolean
  createdAt: Date
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  OWNER: 'Owner',
  ADMIN: 'Admin',
  COMERCIAL: 'Comercial',
  FINANCE: 'Finance',
  USER: 'User',
}

function ActionsCell({ row, currentUserId }: { row: { original: UserRow }; currentUserId: string }) {
  const [isPending, startTransition] = useTransition()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const user = row.original
  const isSelf = user.id === currentUserId

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
            <Link href={`/users/${user.id}`}>Edit</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isSelf}
            onClick={() => startTransition(async () => {
              const result = await toggleUserActive(user.id)
              if (result?.error) toast.error(result.error)
              else toast.success(user.isActive ? 'User deactivated.' : 'User reactivated.')
            })}
          >
            {user.isActive ? 'Deactivate' : 'Reactivate'}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => startTransition(async () => {
              const result = await resendWelcomeEmail(user.id)
              if (result?.error) toast.error(result.error)
              else toast.success('Email resent successfully.')
            })}
          >
            Resend email
          </DropdownMenuItem>
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
        description={`The user "${user.firstName} ${user.lastName}" will be permanently deleted.`}
        onConfirm={() => startTransition(async () => {
          const result = await deleteUser(user.id)
          if (result?.error) toast.error(result.error)
          else { toast.success('User deleted successfully.'); setDeleteOpen(false) }
        })}
      />
    </>
  )
}

export function getColumns(currentUserId: string): ColumnDef<UserRow>[] {
  return [
    {
      id: 'name',
      accessorFn: (row) => `${row.firstName} ${row.lastName}`,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => (
        <Link href={`/users/${row.original.id}`} className="hover:underline">
          {row.original.firstName} {row.original.lastName}
        </Link>
      ),
    },
    {
      accessorKey: 'email',
      header: ({ column }) => <DataTableColumnHeader column={column} title="E-mail" />,
    },
    {
      accessorKey: 'role',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
      cell: ({ row }) => (
        <Badge variant="secondary">{ROLE_LABELS[row.original.role] ?? row.original.role}</Badge>
      ),
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
      cell: ({ row }) => <ActionsCell row={row} currentUserId={currentUserId} />,
    },
  ]
}
