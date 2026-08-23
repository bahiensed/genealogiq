'use client'

import { useTranslations, useLocale } from 'next-intl'
import { DataTable } from '@genealogiq/ui/data-table'
import { getColumns, type PackageRow } from './columns'

interface PackagesDataTableProps {
  currentUserRole: string
  data: PackageRow[]
  basePath?: string
  emptyMessage?: string
  /** Noun used in column headers/labels. 'product' for Physical QR, 'package' for Digital. */
}

export function PackagesDataTable({ currentUserRole, data, basePath, emptyMessage }: PackagesDataTableProps) {
  const t = useTranslations('Packages')
  const locale = useLocale()

  const Noun = t('noun.product')

  const columnLabels: Record<string, string> = {
    name:        t('table.name', { noun: Noun }),
    quantity:    t('table.quantity'),
    price:       t('table.price', { noun: Noun }),
    description: t('table.description', { noun: Noun }),
    isActive:    t('table.status'),
    createdAt:   t('table.createdAt'),
  }

  return (
    <DataTable
      columns={getColumns(currentUserRole, t, locale, basePath)}
      data={data}
      emptyMessage={emptyMessage ?? t('table.emptyProduct')}
      initialSorting={[{ id: 'quantity', desc: false }]}
      columnLabels={columnLabels}
    />
  )
}
