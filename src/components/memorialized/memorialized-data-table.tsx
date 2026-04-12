'use client'

import { DataTable } from '@/components/ui/data-table'
import { memorializedColumns, type MemorializedRow } from './columns'

interface MemorializedDataTableProps {
  data: MemorializedRow[]
}

export function MemorializedDataTable({ data }: MemorializedDataTableProps) {
  return (
    <DataTable
      columns={memorializedColumns}
      data={data}
      filterPlaceholder="Filtrar por nome…"
      emptyMessage="Nenhum perfil memorializado encontrado."
    />
  )
}
