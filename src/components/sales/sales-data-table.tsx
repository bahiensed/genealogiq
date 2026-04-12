'use client'

import { DataTable } from '@/components/ui/data-table'
import { saleColumns, type SaleRow } from './columns'

interface SalesDataTableProps {
  data: SaleRow[]
}

const COLUMN_LABELS: Record<string, string> = {
  soldAt:          'Date',
  customer:        'Customer',
  package:         'Package Name',
  quantity:        'Package Qtd.',
  totalLicenses:   'License Total Qtd.',
  packagePrice:    'Package Price',
  licenseUnitPrice:'License Un. Price',
  totalPrice:      'Total Price',
  seller:          'Seller',
}

const INITIAL_VISIBILITY = {
  totalLicenses:    false,
  licenseUnitPrice: false,
}

export function SalesDataTable({ data }: SalesDataTableProps) {
  return (
    <DataTable
      columns={saleColumns}
      data={data}
      filterColumn="customer"
      filterPlaceholder="Filtrar por customer…"
      emptyMessage="Nenhuma venda registrada."
      columnLabels={COLUMN_LABELS}
      initialColumnVisibility={INITIAL_VISIBILITY}
    />
  )
}
