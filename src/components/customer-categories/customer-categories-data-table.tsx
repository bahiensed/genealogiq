'use client'

import { DataTable } from '@/components/ui/data-table'
import { getColumns, type CustomerCategoryRow } from './columns'

interface CustomerCategoriesDataTableProps {
  currentUserRole: string
  data: CustomerCategoryRow[]
}

export function CustomerCategoriesDataTable({ currentUserRole, data }: CustomerCategoriesDataTableProps) {
  return (
    <DataTable
      columns={getColumns(currentUserRole)}
      data={data}
      emptyMessage="No customer categories found."
    />
  )
}
