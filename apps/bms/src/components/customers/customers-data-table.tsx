'use client'

import { useTranslations, useLocale } from 'next-intl'
import { DataTable } from '@genealogiq/ui/data-table'
import { getColumns, type CustomerRow } from './columns'

interface CustomersDataTableProps {
  currentUserRole: string
  data: CustomerRow[]
}

export function CustomersDataTable({ currentUserRole, data }: CustomersDataTableProps) {
  const t = useTranslations('Customers')
  const locale = useLocale()

  const columnLabels: Record<string, string> = {
    name:       t('table.name'),
    entityType: t('table.type'),
    email:      t('table.email'),
    isActive:   t('table.status'),
    createdAt:  t('table.createdAt'),
  }

  return (
    <DataTable
      columns={getColumns(currentUserRole, t, locale)}
      data={data}
      emptyMessage={t('table.empty')}
      columnLabels={columnLabels}
    />
  )
}
