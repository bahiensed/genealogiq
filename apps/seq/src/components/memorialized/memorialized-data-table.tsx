'use client'

import { DataTable } from '@genealogiq/ui/data-table'
import { memorializedColumns, type MemorializedRow } from './columns'

interface MemorializedDataTableProps {
  data: MemorializedRow[]
}

const COLUMN_LABELS: Record<string, string> = {
  name:      'Name',
  birthDate: 'Birth date',
  deathDate: 'Death date',
}

export function MemorializedDataTable({ data }: MemorializedDataTableProps) {
  return (
    <DataTable
      columns={memorializedColumns}
      data={data}
      filterPlaceholder="Filter by name…"
      emptyMessage="No memorialized profiles found."
      columnLabels={COLUMN_LABELS}
    />
  )
}
