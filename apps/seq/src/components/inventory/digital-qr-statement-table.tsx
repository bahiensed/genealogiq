'use client'

import { DataTable } from '@genealogiq/ui/data-table'
import { digitalQrStatementColumns } from './digital-qr-columns'
import type { StatementRow } from '@/queries/digital-qr-statement'

const COLUMN_LABELS: Record<string, string> = {
  date:        'Date',
  description: 'QR Codes',
  units:       'Units',
  unitPrice:   'Unit Price',
  balance:     'Available',
}

export function DigitalQrStatementTable({ data }: { data: StatementRow[] }) {
  return (
    <DataTable
      columns={digitalQrStatementColumns}
      data={data}
      emptyMessage="No QR code activity yet."
      columnLabels={COLUMN_LABELS}
    />
  )
}
