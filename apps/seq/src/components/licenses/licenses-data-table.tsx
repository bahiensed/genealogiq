'use client'

import { useTranslations, useLocale } from 'next-intl'
import { DataTable } from '@genealogiq/ui/data-table'
import { buildLicenseColumns } from './columns'
import type { LicenseRow } from '@/queries/licenses'

interface LicensesDataTableProps {
  data:   LicenseRow[]
  appUrl: string
}

export function LicensesDataTable({ data, appUrl }: LicensesDataTableProps) {
  const t = useTranslations('Licenses')
  const locale = useLocale()

  const columnLabels: Record<string, string> = {
    genCode:  t('table.code'),
    url:      t('table.url'),
    status:   t('table.status'),
    printed:  t('table.printed'),
    soldTo:   t('table.soldTo'),
    memorial: t('table.memorial'),
  }

  return (
    <DataTable
      columns={buildLicenseColumns(appUrl, t, locale)}
      data={data}
      filterColumn="genCode"
      emptyMessage={t('table.empty')}
      columnLabels={columnLabels}
    />
  )
}
