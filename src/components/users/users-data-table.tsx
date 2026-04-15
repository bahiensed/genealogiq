'use client'

import { DataTable } from '@/components/ui/data-table'
import { getColumns, type UserRow } from './columns'

interface UsersDataTableProps {
  currentUserId: string
  currentUserRole: string
  data: UserRow[]
}

export function UsersDataTable({ currentUserId, currentUserRole, data }: UsersDataTableProps) {
  const columns = getColumns({ currentUserId, currentUserRole })
  return (
    <DataTable
      columns={columns}
      data={data}
      emptyMessage="No users found."
    />
  )
}
