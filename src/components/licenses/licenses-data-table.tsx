'use client'

import { DataTable } from '@/components/ui/data-table'
import { buildLicenseColumns } from './columns'
import type { LicenseRow } from '@/queries/licenses'

interface LicensesDataTableProps {
  data:   LicenseRow[]
  appUrl: string
}

const COLUMN_LABELS: Record<string, string> = {
  genCode:     'Code',
  status:      'Status',
  activatedAt: 'Activated',
}

export function LicensesDataTable({ data, appUrl }: LicensesDataTableProps) {
  const columns = buildLicenseColumns(appUrl)
  return (
    <DataTable
      columns={columns}
      data={data}
      filterColumn="genCode"
      columnLabels={COLUMN_LABELS}
    />
  )
}
