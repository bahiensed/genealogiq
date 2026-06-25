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
import { toggleUserActive, deleteUser, resendWelcomeEmail } from '@/actions/user.actions'

// Loose translator type so getColumns can stay a plain function (not a hook).
// The caller (users-data-table) passes useTranslations('Users').
type Translator = (key: string, values?: Record<string, string | number | Date>) => string

export type UserRow = {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  isActive: boolean
  createdAt: Date
}

function roleLabel(role: string, t: Translator): string {
  const key = `roles.${role}`
  const label = t(key)
  return label === key ? role : label
}

function ActionsCell({ row, currentUserId, t }: { row: { original: UserRow }; currentUserId: string; t: Translator }) {
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
            <span className="sr-only">{t('actions.openMenu')}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/users/${user.id}`}>{t('actions.edit')}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isSelf}
            onClick={() => startTransition(async () => {
              const result = await toggleUserActive(user.id)
              if (!result.ok) toast.error(result.message)
              else toast.success(user.isActive ? t('toasts.deactivated') : t('toasts.reactivated'))
            })}
          >
            {user.isActive ? t('actions.deactivate') : t('actions.reactivate')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => startTransition(async () => {
              const result = await resendWelcomeEmail(user.id)
              if (!result.ok) toast.error(result.message)
              else toast.success(t('toasts.emailResent'))
            })}
          >
            {t('actions.resendEmail')}
          </DropdownMenuItem>
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
        description={t('toasts.deleteConfirm', { name: `${user.firstName} ${user.lastName}` })}
        onConfirm={() => startTransition(async () => {
          const result = await deleteUser(user.id)
          if (!result.ok) toast.error(result.message)
          else { toast.success(t('toasts.deleted')); setDeleteOpen(false) }
        })}
      />
    </>
  )
}

export function getColumns(currentUserId: string, t: Translator, locale: string): ColumnDef<UserRow>[] {
  return [
    {
      id: 'name',
      accessorFn: (row) => `${row.firstName} ${row.lastName}`,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.name')} />,
      cell: ({ row }) => (
        <Link href={`/users/${row.original.id}`} className="hover:underline">
          {row.original.firstName} {row.original.lastName}
        </Link>
      ),
    },
    {
      accessorKey: 'email',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.email')} />,
    },
    {
      accessorKey: 'role',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.role')} />,
      cell: ({ row }) => (
        <Badge variant="secondary">{roleLabel(row.original.role, t)}</Badge>
      ),
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
      cell: ({ row }) => <ActionsCell row={row} currentUserId={currentUserId} t={t} />,
    },
  ]
}
