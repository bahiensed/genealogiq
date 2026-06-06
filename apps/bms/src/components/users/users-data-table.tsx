'use client'

import { DataTable } from '@genealogiq/ui/data-table'
import { getColumns, type UserRow } from './columns'

interface UsersDataTableProps {
  currentUserId: string
  currentUserRole: string
  data: UserRow[]
}

const COLUMN_LABELS: Record<string, string> = {
  name:      'Name',
  email:     'E-mail',
  role:      'Role',
  isActive:  'Status',
  createdAt: 'Created at',
}

export function UsersDataTable({ currentUserId, currentUserRole, data }: UsersDataTableProps) {
  const columns = getColumns({ currentUserId, currentUserRole })
  return (
    <DataTable
      columns={columns}
      data={data}
      emptyMessage="No users found."
      columnLabels={COLUMN_LABELS}
    />
  )
}
