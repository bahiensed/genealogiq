'use client'

import { useTranslations, useLocale } from 'next-intl'
import { DataTable } from '@genealogiq/ui/data-table'
import { getColumns, type MemorializedRow } from './columns'

interface MemorializedDataTableProps {
  data: MemorializedRow[]
}

export function MemorializedDataTable({ data }: MemorializedDataTableProps) {
  const t = useTranslations('Memorialized')
  const locale = useLocale()

  const columnLabels: Record<string, string> = {
    name:      t('table.name'),
    birthDate: t('table.birthDate'),
    deathDate: t('table.deathDate'),
  }

  return (
    <DataTable
      columns={getColumns(t, locale)}
      data={data}
      filterPlaceholder={t('table.filterPlaceholder')}
      emptyMessage={t('table.empty')}
      columnLabels={columnLabels}
    />
  )
}
