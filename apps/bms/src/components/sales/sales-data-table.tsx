'use client'

import { useTranslations, useLocale } from 'next-intl'
import { DataTable } from '@genealogiq/ui/data-table'
import { getColumns, type SaleRow } from './columns'

interface SalesDataTableProps {
  currentUserRole: string
  data: SaleRow[]
}

const INITIAL_VISIBILITY = {
  totalSubscriptions:    false,
  subscriptionUnitPrice: false,
}

export function SalesDataTable({ currentUserRole, data }: SalesDataTableProps) {
  const t = useTranslations('Sales')
  const locale = useLocale()

  const columnLabels: Record<string, string> = {
    createdAt:             t('table.date'),
    status:                t('table.status'),
    customer:              t('table.customer'),
    package:               t('table.package'),
    quantity:              t('table.quantity'),
    totalSubscriptions:    t('table.totalSubscriptions'),
    packagePrice:          t('table.packagePrice'),
    subscriptionUnitPrice: t('table.subscriptionUnitPrice'),
    totalPrice:            t('table.totalPrice'),
    seller:                t('table.seller'),
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
