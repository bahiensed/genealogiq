'use client'

import { DataTable } from '@/components/ui/data-table'
import { getColumns, type SaleRow } from './columns'

interface SalesDataTableProps {
  currentUserRole: string
  data: SaleRow[]
}

const COLUMN_LABELS: Record<string, string> = {
  createdAt:        'Date',
  customer:         'Customer',
  package:          'Package',
  quantity:         'Package Qtd.',
  totalLicenses:    'QR-Codes / Package',
  packagePrice:     'Package Price',
  licenseUnitPrice: 'QR-Code Un. Price',
  totalPrice:       'Total Order Price',
  seller:           'Seller',
}

const INITIAL_VISIBILITY = {
  totalLicenses:    false,
  licenseUnitPrice: false,
}

export function SalesDataTable({ currentUserRole, data }: SalesDataTableProps) {
  return (
    <DataTable
      columns={getColumns(currentUserRole)}
      data={data}
      filterColumn="customer"
      filterPlaceholder="Search..."
      emptyMessage="No sales found."
      columnLabels={COLUMN_LABELS}
      initialColumnVisibility={INITIAL_VISIBILITY}
    />
  )
}
