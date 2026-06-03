'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import type { PhysicalQrRow } from '@/queries/physical-qr'

const columns: ColumnDef<PhysicalQrRow>[] = [
  {
    accessorKey: 'tenantName',
    header: 'Tenant',
  },
  {
    accessorKey: 'packageName',
    header: 'Package',
  },
  {
    accessorKey: 'saleDate',
    header: 'Sale Date',
    cell: ({ row }) =>
      (row.original.saleDate as Date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      }),
  },
  {
    accessorKey: 'total',
    header: 'Total',
  },
  {
    accessorKey: 'activated',
    header: 'Activated',
    cell: ({ row }) => (
      <span className="font-medium text-emerald-600">{row.original.activated}</span>
    ),
  },
  {
    accessorKey: 'available',
    header: 'Available',
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.available}</span>
    ),
  },
]

const COLUMN_LABELS: Record<string, string> = {
  tenantName:  'Tenant',
  packageName: 'Package',
  saleDate:    'Sale Date',
  total:       'Total',
  activated:   'Activated',
  available:   'Available',
}

interface PhysicalQrDataTableProps {
  data: PhysicalQrRow[]
}

export function PhysicalQrDataTable({ data }: PhysicalQrDataTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      emptyMessage="No physical QR codes found."
      initialSorting={[{ id: 'saleDate', desc: true }]}
      columnLabels={COLUMN_LABELS}
      filterColumn="tenantName"
    />
  )
}
