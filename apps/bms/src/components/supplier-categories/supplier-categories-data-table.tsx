'use client'

import { useTranslations, useLocale } from 'next-intl'
import { DataTable } from '@genealogiq/ui/data-table'
import { getColumns, type SupplierCategoryRow } from './columns'

interface SupplierCategoriesDataTableProps {
  currentUserRole: string
  data: SupplierCategoryRow[]
}

export function SupplierCategoriesDataTable({ currentUserRole, data }: SupplierCategoriesDataTableProps) {
  const t = useTranslations('SupplierCategories')
  const locale = useLocale()

  const columnLabels: Record<string, string> = {
    name:        t('table.name'),
    description: t('table.description'),
    isActive:    t('table.status'),
    createdAt:   t('table.createdAt'),
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
