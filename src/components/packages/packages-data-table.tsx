'use client'

import { DataTable } from '@/components/ui/data-table'
import { getColumns, type PackageRow } from './columns'

interface PackagesDataTableProps {
  currentUserRole: string
  data: PackageRow[]
}

const COLUMN_LABELS: Record<string, string> = {
  name:        'Package Name',
  license:     'License TYpe',
  quantity:    'Licenses / Package',
  price:       'Package Price',
  description: 'Package Description',
  isActive:    'Status',
  createdAt:   'Created at',
}

export function PackagesDataTable({ currentUserRole, data }: PackagesDataTableProps) {
  return (
    <DataTable
      columns={getColumns(currentUserRole)}
      data={data}
      emptyMessage="No packages found."
      initialSorting={[{ id: 'quantity', desc: false }]}
      columnLabels={COLUMN_LABELS}
    />
  )
}
