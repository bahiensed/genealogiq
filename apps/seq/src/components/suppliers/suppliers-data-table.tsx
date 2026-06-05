'use client'

import { DataTable } from '@/components/ui/data-table'
import { supplierColumns, type SupplierRow } from './columns'

interface SuppliersDataTableProps {
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

export function SuppliersDataTable({ data }: SuppliersDataTableProps) {
  return (
    <DataTable
      columns={supplierColumns}
      data={data}
      emptyMessage="No suppliers found."
      columnLabels={COLUMN_LABELS}
    />
  )
}
