'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@genealogiq/ui/badge'
import { DataTableColumnHeader } from '@genealogiq/ui/data-table-column-header'
import { RowActions } from '@genealogiq/ui/row-actions'
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

function ActionsCell({ row, currentUserRole, t }: { row: { original: UserRow }; currentUserRole: string; t: Translator }) {
  const user = row.original
  const canManage = currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'OWNER'

  return (
    <RowActions
      menuLabel={t('actions.openMenu')}
      items={[
        { kind: 'link', label: t('actions.edit'), href: `/system/users/${user.id}` },
        {
          kind: 'action',
          label: user.isActive ? t('actions.deactivate') : t('actions.reactivate'),
          run: () => toggleUserActive(user.id),
          successMessage: user.isActive ? t('toasts.deactivated') : t('toasts.reactivated'),
        },
        {
          kind: 'action',
          label: t('actions.resendEmail'),
          run: () => resendWelcomeEmail(user.id),
          successMessage: t('toasts.emailResent'),
        },
      ]}
      remove={
        canManage
          ? {
              label: t('actions.delete'),
              run: () => deleteUser(user.id),
              confirmDescription: t('toasts.deleteConfirm', { name: `${user.firstName} ${user.lastName}` }),
              successMessage: t('toasts.deleted'),
            }
          : undefined
      }
    />
  )
}

export function getColumns(
  { currentUserRole }: { currentUserId: string; currentUserRole: string },
  t: Translator,
  locale: string,
): ColumnDef<UserRow>[] {
  return [
    {
      id: 'name',
      accessorFn: (row) => `${row.firstName} ${row.lastName}`,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.name')} />,
      cell: ({ row }) => `${row.original.firstName} ${row.original.lastName}`,
    },
    {
      accessorKey: 'email',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.email')} />,
    },
    {
      accessorKey: 'role',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.role')} />,
      cell: ({ row }) => (
        <Badge variant="secondary">{t(`roles.${row.original.role}`)}</Badge>
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
      cell: ({ row }) => <ActionsCell row={row} currentUserRole={currentUserRole} t={t} />,
    },
  ]
}
