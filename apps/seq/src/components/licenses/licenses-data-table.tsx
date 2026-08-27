'use client'

import { useTranslations, useLocale } from 'next-intl'
import { DataTable } from '@genealogiq/ui/data-table'
import { buildLicenseColumns } from './columns'
import type { LicenseRow } from '@/queries/licenses'

interface LicensesDataTableProps {
  data: LicenseRow[]
}

export function LicensesDataTable({ data }: LicensesDataTableProps) {
  const t = useTranslations('Licenses')
  const locale = useLocale()

  const columnLabels: Record<string, string> = {
    genCode:   t('table.code'),
    status:    t('table.status'),
    soldTo:    t('table.soldTo'),
    activated: t('table.activated'),
    memorial:  t('table.memorial'),
  }

  return (
    <DataTable
      columns={buildLicenseColumns(t, locale)}
      data={data}
      filterColumn="genCode"
      emptyMessage={t('table.empty')}
      columnLabels={columnLabels}
      initialPageSize={20}
    />
  )
}
