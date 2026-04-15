'use client'

import { DataTable } from '@/components/ui/data-table'
import { getColumns, type SupplierCategoryRow } from './columns'

interface SupplierCategoriesDataTableProps {
  currentUserRole: string
  data: SupplierCategoryRow[]
}

export function SupplierCategoriesDataTable({ currentUserRole, data }: SupplierCategoriesDataTableProps) {
  return (
    <DataTable
      columns={getColumns(currentUserRole)}
      data={data}
      emptyMessage="No supplier categories found."
    />
  )
}
