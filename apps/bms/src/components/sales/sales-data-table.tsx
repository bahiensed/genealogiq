'use client'

import { useTranslations, useLocale } from 'next-intl'
import { DataTable } from '@genealogiq/ui/data-table'
import { getColumns, type SaleRow } from './columns'

interface SalesDataTableProps {
  currentUserRole: string
  data: SaleRow[]
}

const INITIAL_VISIBILITY = {
  totalUnits: false,
  unitPrice:  false,
}

export function SalesDataTable({ currentUserRole, data }: SalesDataTableProps) {
  const t = useTranslations('Sales')
  const locale = useLocale()

  const columnLabels: Record<string, string> = {
    createdAt:    t('table.date'),
    status:       t('table.status'),
    customer:     t('table.customer'),
    product:      t('table.product'),
    quantity:     t('table.quantity'),
    totalUnits:   t('table.totalUnits'),
    unitPrice:    t('table.unitPrice'),
    totalPrice:   t('table.totalPrice'),
    seller:       t('table.seller'),
  }

  return (
    <DataTable
      columns={getColumns(currentUserRole, t, locale)}
      data={data}
      filterColumn="customer"
      emptyMessage={t('table.empty')}
      columnLabels={columnLabels}
      initialColumnVisibility={INITIAL_VISIBILITY}
    />
  )
}
