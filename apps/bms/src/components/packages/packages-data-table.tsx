'use client'

import { DataTable } from '@genealogiq/ui/data-table'
import { getColumns, type PackageRow } from './columns'

interface PackagesDataTableProps {
  currentUserRole: string
  data: PackageRow[]
  basePath?: string
  emptyMessage?: string
}

const COLUMN_LABELS: Record<string, string> = {
  name:        'Package Name',
  quantity:    'QR-Codes / Package',
  price:       'Package Price',
  description: 'Package Description',
  isActive:    'Status',
  createdAt:   'Created at',
}

export function PackagesDataTable({ currentUserRole, data, basePath, emptyMessage }: PackagesDataTableProps) {
  return (
    <DataTable
      columns={getColumns(currentUserRole, basePath)}
      data={data}
      emptyMessage={emptyMessage ?? 'No packages found.'}
      initialSorting={[{ id: 'quantity', desc: false }]}
      columnLabels={COLUMN_LABELS}
    />
  )
}
