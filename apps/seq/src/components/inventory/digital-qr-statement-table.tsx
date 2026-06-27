'use client'

import { useTranslations, useLocale } from 'next-intl'
import { DataTable } from '@genealogiq/ui/data-table'
import { getColumns } from './digital-qr-columns'
import type { StatementRow } from '@/queries/digital-qr-statement'

export function DigitalQrStatementTable({ data }: { data: StatementRow[] }) {
  const t = useTranslations('Inventory')
  const locale = useLocale()

  const columnLabels: Record<string, string> = {
    date:        t('digital.table.date'),
    description: t('digital.table.description'),
    units:       t('digital.table.units'),
    unitPrice:   t('digital.table.unitPrice'),
    totalPrice:  t('digital.table.totalPrice'),
    balance:     t('digital.table.balance'),
  }

  return (
    <DataTable
      columns={getColumns(t, locale)}
      data={data}
      filterColumn="description"
      emptyMessage={t('digital.empty')}
      columnLabels={columnLabels}
    />
  )
}
