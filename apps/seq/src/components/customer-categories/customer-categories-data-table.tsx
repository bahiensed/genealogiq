'use client'

import { useTranslations, useLocale } from 'next-intl'
import { DataTable } from '@genealogiq/ui/data-table'
import { getColumns, type CustomerCategoryRow } from './columns'

interface CustomerCategoriesDataTableProps {
  data: CustomerCategoryRow[]
}

export function CustomerCategoriesDataTable({ data }: CustomerCategoriesDataTableProps) {
  const t = useTranslations('CustomerCategories')
  const locale = useLocale()

  const columnLabels: Record<string, string> = {
    name:        t('table.name'),
    description: t('table.description'),
    isActive:    t('table.status'),
    createdAt:   t('table.createdAt'),
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
