'use client'

import { DataTable } from '@/components/ui/data-table'
import { getColumns, type LicenseRow } from './columns'

interface LicensesDataTableProps {
  currentUserRole: string
  data: LicenseRow[]
}

const COLUMN_LABELS: Record<string, string> = {
  name:        'Name',
  description: 'Description',
  isActive:    'Status',
  createdAt:   'Created at',
}

export function LicensesDataTable({ currentUserRole, data }: LicensesDataTableProps) {
  return (
    <DataTable
      columns={getColumns(currentUserRole)}
      data={data}
      filterColumn="name"
      filterPlaceholder="Search..."
      emptyMessage="No licenses found"
      columnLabels={COLUMN_LABELS}
    />
  )
}
