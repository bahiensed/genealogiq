'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { useTranslations, useLocale } from 'next-intl'
import { DataTable } from '@genealogiq/ui/data-table'
import type { PhysicalQrRow } from '@/queries/physical-qr'

// Loose translator type so getColumns can stay a plain function (not a hook).
type Translator = (key: string, values?: Record<string, string | number | Date>) => string

function getColumns(t: Translator, locale: string): ColumnDef<PhysicalQrRow>[] {
  return [
    {
      accessorKey: 'tenantName',
      header: t('table.tenant'),
    },
    {
      accessorKey: 'packageName',
      header: t('table.package'),
    },
    {
      accessorKey: 'saleDate',
      header: t('table.saleDate'),
      cell: ({ row }) =>
        new Intl.DateTimeFormat(locale, {
          year: 'numeric', month: 'short', day: 'numeric',
        }).format(row.original.saleDate as Date),
    },
    {
      accessorKey: 'total',
      header: t('table.total'),
    },
    {
      accessorKey: 'activated',
      header: t('table.activated'),
      cell: ({ row }) => (
        <span className="font-medium text-emerald-600">{row.original.activated}</span>
      ),
    },
    {
      accessorKey: 'available',
      header: t('table.available'),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.available}</span>
      ),
    },
  ]
}

interface PhysicalQrDataTableProps {
  data: PhysicalQrRow[]
}

export function PhysicalQrDataTable({ data }: PhysicalQrDataTableProps) {
  const t = useTranslations('PhysicalQr')
  const locale = useLocale()

  const columnLabels: Record<string, string> = {
    tenantName:  t('table.tenant'),
    packageName: t('table.package'),
    saleDate:    t('table.saleDate'),
    total:       t('table.total'),
    activated:   t('table.activated'),
    available:   t('table.available'),
  }

  return (
    <DataTable
      columns={getColumns(t, locale)}
      data={data}
      emptyMessage={t('table.empty')}
      initialSorting={[{ id: 'saleDate', desc: true }]}
      columnLabels={columnLabels}
      filterColumn="tenantName"
    />
  )
}
