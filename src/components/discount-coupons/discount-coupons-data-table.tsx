'use client'

import { DataTable } from '@/components/ui/data-table'
import { getColumns, type DiscountCouponRow } from './columns'

interface DiscountCouponsDataTableProps {
  currentUserRole: string
  data:            DiscountCouponRow[]
}

const COLUMN_LABELS: Record<string, string> = {
  code:           'Code',
  description:    'Description',
  discount:       'Discount',
  duration:       'Duration',
  maxRedemptions: 'Max uses',
  redeemBy:       'Expires',
  isActive:       'Status',
  createdAt:      'Created at',
}

export function DiscountCouponsDataTable({ currentUserRole, data }: DiscountCouponsDataTableProps) {
  return (
    <DataTable
      columns={getColumns(currentUserRole)}
      data={data}
      emptyMessage="No discount coupons yet."
      columnLabels={COLUMN_LABELS}
    />
  )
}
