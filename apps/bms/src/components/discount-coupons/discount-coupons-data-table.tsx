'use client'

import { useTranslations, useLocale } from 'next-intl'
import { DataTable } from '@genealogiq/ui/data-table'
import { getColumns, type DiscountCouponRow } from './columns'

interface DiscountCouponsDataTableProps {
  currentUserRole: string
  data:            DiscountCouponRow[]
}

export function DiscountCouponsDataTable({ currentUserRole, data }: DiscountCouponsDataTableProps) {
  const t = useTranslations('DiscountCoupons')
  const locale = useLocale()

  const columnLabels: Record<string, string> = {
    code:           t('table.code'),
    description:    t('table.description'),
    discount:       t('table.discount'),
    duration:       t('table.duration'),
    maxRedemptions: t('table.maxUses'),
    redeemBy:       t('table.expires'),
    isActive:       t('table.status'),
    createdAt:      t('table.createdAt'),
  }

  return (
    <DataTable
      columns={getColumns(currentUserRole, t, locale)}
      data={data}
      filterColumn="code"
      filterPlaceholder={t('table.searchByCode')}
      emptyMessage={t('table.empty')}
      columnLabels={columnLabels}
    />
  )
}
