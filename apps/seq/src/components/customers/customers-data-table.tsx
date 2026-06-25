'use client'

import { useTranslations, useLocale } from 'next-intl'
import { DataTable } from '@genealogiq/ui/data-table'
import { getColumns, type CustomerRow } from './columns'

interface CustomersDataTableProps {
  data: CustomerRow[]
}

export function CustomersDataTable({ data }: CustomersDataTableProps) {
  const t = useTranslations('Customers')
  const locale = useLocale()

  const columnLabels: Record<string, string> = {
    name:      t('table.name'),
    category:  t('table.category'),
    email:     t('table.email'),
    isActive:  t('table.status'),
    createdAt: t('table.createdAt'),
  }

  return (
    <DataTable
      columns={getColumns(t, locale)}
      data={data}
      emptyMessage={t('table.empty')}
      columnLabels={columnLabels}
    />
  )
}
