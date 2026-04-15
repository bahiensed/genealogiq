'use client'

import { DataTable } from '@/components/ui/data-table'
import { getColumns, type CustomerRow } from './columns'

interface CustomersDataTableProps {
  currentUserRole: string
  data: CustomerRow[]
}

export function CustomersDataTable({ currentUserRole, data }: CustomersDataTableProps) {
  return (
    <DataTable
      columns={getColumns(currentUserRole)}
      data={data}
      emptyMessage="No customers found."
    />
  )
}
