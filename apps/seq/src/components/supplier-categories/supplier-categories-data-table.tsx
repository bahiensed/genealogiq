'use client'

import { DataTable } from '@genealogiq/ui/data-table'
import { supplierCategoryColumns, type SupplierCategoryRow } from './columns'

interface SupplierCategoriesDataTableProps {
  data: SupplierCategoryRow[]
}

const COLUMN_LABELS: Record<string, string> = {
  name:        'Name',
  description: 'Description',
  isActive:    'Status',
  createdAt:   'Created at',
}

export function SupplierCategoriesDataTable({ data }: SupplierCategoriesDataTableProps) {
  return (
    <DataTable
      columns={supplierCategoryColumns}
      data={data}
      emptyMessage="No supplier categories found."
      columnLabels={COLUMN_LABELS}
    />
  )
}
