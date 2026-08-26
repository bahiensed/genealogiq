'use client'

import { useTranslations, useLocale } from 'next-intl'
import { DataTable } from '@genealogiq/ui/data-table'
import { getColumns, type ContractRow } from './columns'

export function ContractsDataTable({ data }: { data: ContractRow[] }) {
  const t = useTranslations('Contracts')
  const locale = useLocale()

  return (
    <DataTable
      columns={getColumns(t, locale)}
      data={data}
      emptyMessage={t('table.empty')}
      initialSorting={[{ id: 'createdAt', desc: true }]}
      columnLabels={{
        tenant: t('table.partner'), plan: t('table.plan'), status: t('table.status'),
        cycle: t('table.cycle'), cycles: t('table.renewals'), amount: t('table.amount'),
        createdAt: t('table.since'),
      }}
    />
  )
}
