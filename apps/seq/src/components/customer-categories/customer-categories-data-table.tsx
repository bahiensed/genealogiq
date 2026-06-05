'use client'

import { DataTable } from '@/components/ui/data-table'
import { customerCategoryColumns, type CustomerCategoryRow } from './columns'

interface CustomerCategoriesDataTableProps {
  data: CustomerCategoryRow[]
}

const COLUMN_LABELS: Record<string, string> = {
  name:        'Name',
  description: 'Description',
  isActive:    'Status',
  createdAt:   'Created at',
}

export function CustomerCategoriesDataTable({ data }: CustomerCategoriesDataTableProps) {
  return (
    <DataTable
      columns={customerCategoryColumns}
      data={data}
      emptyMessage="No customer categories found."
      columnLabels={COLUMN_LABELS}
    />
  )
}
