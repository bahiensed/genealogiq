'use client'

import { DataTable } from '@genealogiq/ui/data-table'
import { getColumns, type SupplierRow } from './columns'

interface SuppliersDataTableProps {
  currentUserRole: string
  data: SupplierRow[]
}

const COLUMN_LABELS: Record<string, string> = {
  name:       'Name',
  entityType: 'Type',
  category:   'Category',
  email:      'E-mail',
  isActive:   'Status',
  createdAt:  'Created at',
}

export function SuppliersDataTable({ currentUserRole, data }: SuppliersDataTableProps) {
  return (
    <DataTable
      columns={getColumns(currentUserRole)}
      data={data}
      emptyMessage="No suppliers found."
      columnLabels={COLUMN_LABELS}
    />
  )
}
