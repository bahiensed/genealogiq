'use client'

import { useTranslations, useLocale } from 'next-intl'
import { DataTable } from '@genealogiq/ui/data-table'
import { getColumns, type SupplierRow } from './columns'

interface SuppliersDataTableProps {
  currentUserRole: string
  data: SupplierRow[]
}

export function SuppliersDataTable({ currentUserRole, data }: SuppliersDataTableProps) {
  const t = useTranslations('Suppliers')
  const locale = useLocale()

  const columnLabels: Record<string, string> = {
    name:       t('table.name'),
    entityType: t('table.type'),
    category:   t('table.category'),
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
