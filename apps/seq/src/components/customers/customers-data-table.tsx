'use client'

import { DataTable } from '@genealogiq/ui/data-table'
import { customerColumns, type CustomerRow } from './columns'

interface CustomersDataTableProps {
  data: CustomerRow[]
}

const COLUMN_LABELS: Record<string, string> = {
  name:      'Name',
  category:  'Category',
  email:     'E-mail',
  isActive:  'Status',
  createdAt: 'Created at',
}

export function CustomersDataTable({ data }: CustomersDataTableProps) {
  return (
    <DataTable
      columns={customerColumns}
      data={data}
      emptyMessage="No customers found"
      columnLabels={COLUMN_LABELS}
    />
  )
}
