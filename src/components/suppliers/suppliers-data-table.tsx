'use client'

import { DataTable } from '@/components/ui/data-table'
import { getColumns, type SupplierRow } from './columns'

interface SuppliersDataTableProps {
  currentUserRole: string
  data: SupplierRow[]
}

export function SuppliersDataTable({ currentUserRole, data }: SuppliersDataTableProps) {
  return (
    <DataTable
      columns={getColumns(currentUserRole)}
      data={data}
      emptyMessage="No suppliers found."
    />
  )
}
