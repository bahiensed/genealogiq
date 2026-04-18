'use client'

import { DataTable } from '@/components/ui/data-table'
import { getColumns, type CustomerCategoryRow } from './columns'

interface CustomerCategoriesDataTableProps {
  currentUserRole: string
  data: CustomerCategoryRow[]
}

const COLUMN_LABELS: Record<string, string> = {
  name:        'Name',
  description: 'Description',
  isActive:    'Status',
  createdAt:   'Created at',
}

export function CustomerCategoriesDataTable({ currentUserRole, data }: CustomerCategoriesDataTableProps) {
  return (
    <DataTable
      columns={getColumns(currentUserRole)}
      data={data}
      emptyMessage="No customer categories found."
      columnLabels={COLUMN_LABELS}
    />
  )
}
