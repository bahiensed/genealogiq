'use client'

import { useTranslations, useLocale } from 'next-intl'
import { DataTable } from '@genealogiq/ui/data-table'
import { getColumns, type SubscriptionRow } from './columns'

interface SubscriptionsDataTableProps {
  currentUserRole: string
  data: SubscriptionRow[]
}

const INITIAL_COLUMN_VISIBILITY = {
  createdAt: false,
}

export function SubscriptionsDataTable({ currentUserRole, data }: SubscriptionsDataTableProps) {
  const t = useTranslations('Subscriptions')
  const locale = useLocale()

  const columnLabels: Record<string, string> = {
    code:        t('table.code'),
    name:        t('table.name'),
    termLength:  t('table.term'),
    priceUsd:    t('table.price'),
    isActive:    t('table.status'),
    createdAt:   t('table.createdAt'),
  }

  return (
    <DataTable
      columns={getColumns(currentUserRole, t, locale)}
      data={data}
      filterColumn="name"
      initialSorting={[{ id: 'code', desc: false }]}
      initialColumnVisibility={INITIAL_COLUMN_VISIBILITY}
      emptyMessage={t('table.empty')}
      columnLabels={columnLabels}
    />
  )
}
