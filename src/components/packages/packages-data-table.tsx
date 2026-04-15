'use client'

import { DataTable } from '@/components/ui/data-table'
import { getColumns, type PackageRow } from './columns'

interface PackagesDataTableProps {
  currentUserRole: string
  data: PackageRow[]
}

export function PackagesDataTable({ currentUserRole, data }: PackagesDataTableProps) {
  return (
    <DataTable
      columns={getColumns(currentUserRole)}
      data={data}
      emptyMessage="No packages found."
    />
  )
}
