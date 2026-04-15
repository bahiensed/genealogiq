'use client'

import { DataTable } from '@/components/ui/data-table'
import { getColumns, type LicenseRow } from './columns'

interface LicensesDataTableProps {
  currentUserRole: string
  data: LicenseRow[]
}

export function LicensesDataTable({ currentUserRole, data }: LicensesDataTableProps) {
  return (
    <DataTable
      columns={getColumns(currentUserRole)}
      data={data}
      filterColumn="component"
      filterPlaceholder="Search..."
      emptyMessage="No licenses found."
    />
  )
}
