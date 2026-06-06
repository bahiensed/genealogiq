'use client'

import { DataTable } from '@genealogiq/ui/data-table'
import { getColumns, type SupplierCategoryRow } from './columns'

interface SupplierCategoriesDataTableProps {
  currentUserRole: string
  data: SupplierCategoryRow[]
}

const COLUMN_LABELS: Record<string, string> = {
  name:        'Name',
  description: 'Description',
  isActive:    'Status',
  createdAt:   'Created at',
}

export function SupplierCategoriesDataTable({ currentUserRole, data }: SupplierCategoriesDataTableProps) {
  return (
    <DataTable
      columns={getColumns(currentUserRole)}
      data={data}
      emptyMessage="No supplier categories found."
      columnLabels={COLUMN_LABELS}
    />
  )
}
