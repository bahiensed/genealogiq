'use client'

import { DataTable } from '@genealogiq/ui/data-table'
import { getColumns, type CustomerRow } from './columns'

interface CustomersDataTableProps {
  currentUserRole: string
  data: CustomerRow[]
}

const COLUMN_LABELS: Record<string, string> = {
  name:       'Name',
  entityType: 'Type',
  category:   'Category',
  email:      'E-mail',
  isActive:   'Status',
  createdAt:  'Created at',
}

export function CustomersDataTable({ currentUserRole, data }: CustomersDataTableProps) {
  return (
    <DataTable
      columns={getColumns(currentUserRole)}
      data={data}
      emptyMessage="No customers found."
      columnLabels={COLUMN_LABELS}
    />
  )
}
