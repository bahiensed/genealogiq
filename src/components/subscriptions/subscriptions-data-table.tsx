'use client'

import { DataTable } from '@/components/ui/data-table'
import { getColumns, type SubscriptionRow } from './columns'

interface SubscriptionsDataTableProps {
  currentUserRole: string
  data: SubscriptionRow[]
}

const COLUMN_LABELS: Record<string, string> = {
  name:        'Name',
  maxProfiles: 'Maximum Profiles',
  termLength:  'Term Length in Months',
  price:       'Price',
  description: 'Description',
  isActive:    'Status',
  createdAt:   'Created at',
}

export function SubscriptionsDataTable({ currentUserRole, data }: SubscriptionsDataTableProps) {
  return (
    <DataTable
      columns={getColumns(currentUserRole)}
      data={data}
      filterColumn="name"
      filterPlaceholder="Search..."
      emptyMessage="No subscriptions found"
      columnLabels={COLUMN_LABELS}
    />
  )
}
