'use client'

import { useTranslations, useLocale } from 'next-intl'
import { DataTable } from '@genealogiq/ui/data-table'
import { getColumns, type PartnerPlanRow } from './columns'

export function PartnerPlansDataTable({ data }: { data: PartnerPlanRow[] }) {
  const t = useTranslations('PartnerPlans')
  const locale = useLocale()

  const columnLabels: Record<string, string> = {
    name:            t('table.name'),
    annualAllowance: t('table.allowance'),
    prices:          t('table.cash'),
    installments:    t('table.installments'),
    unitReference:   t('table.perGenCode'),
    synced:          t('table.stripe'),
    isActive:        t('table.status'),
    contracts:       t('table.contracts'),
  }

  return (
    <DataTable
      columns={getColumns(t, locale)}
      data={data}
      emptyMessage={t('table.empty')}
      initialSorting={[{ id: 'annualAllowance', desc: false }]}
      columnLabels={columnLabels}
    />
  )
}
