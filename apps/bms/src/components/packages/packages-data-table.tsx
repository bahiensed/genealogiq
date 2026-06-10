'use client'

import { DataTable } from '@genealogiq/ui/data-table'
import { getColumns, type PackageRow } from './columns'

interface PackagesDataTableProps {
  currentUserRole: string
  data: PackageRow[]
  basePath?: string
  emptyMessage?: string
  /** Noun used in column headers/labels. 'product' for Physical QR, 'package' for Digital. */
  noun?: 'package' | 'product'
}

function columnLabels(noun: 'package' | 'product'): Record<string, string> {
  const Noun = noun === 'product' ? 'Product' : 'Package'
  return {
    name:        `${Noun} Name`,
    quantity:    'QR-Codes / Package',
    price:       `${Noun} Price`,
    description: `${Noun} Description`,
    isActive:    'Status',
    createdAt:   'Created at',
  }
}

export function PackagesDataTable({ currentUserRole, data, basePath, emptyMessage, noun = 'package' }: PackagesDataTableProps) {
  return (
    <DataTable
      columns={getColumns(currentUserRole, basePath, noun)}
      data={data}
      emptyMessage={emptyMessage ?? 'No packages found.'}
      initialSorting={[{ id: 'quantity', desc: false }]}
      columnLabels={columnLabels(noun)}
    />
  )
}
