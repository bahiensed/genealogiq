'use client'

import { DataTable } from '@/components/ui/data-table'
import { getColumns, type SubscriptionRow } from './columns'

interface SubscriptionsDataTableProps {
  currentUserRole: string
  data: SubscriptionRow[]
}

const COLUMN_LABELS: Record<string, string> = {
  code:                  'Code',
  name:                  'Name',
  maxProfiles:           'Memo',
  bioMaxChars:           'Bio Chars',
  bioMaxImages:          'Bio Images',
  galleryMaxImages:      'Gallery Images',
  galleryMaxVideos:      'Gallery Videos',
  geolocationFullAccess: 'Geo',
  qrCodeAccess:          'QR Code',
  termLength:            'Term',
  price:                 'Price',
  isActive:              'Status',
  createdAt:             'Created at',
}

const INITIAL_COLUMN_VISIBILITY = {
  bioMaxChars:      false,
  bioMaxImages:     false,
  galleryMaxImages: false,
  galleryMaxVideos: false,
  createdAt:        false,
}

export function SubscriptionsDataTable({ currentUserRole, data }: SubscriptionsDataTableProps) {
  return (
    <DataTable
      columns={getColumns(currentUserRole)}
      data={data}
      filterColumn="name"
      filterPlaceholder="Search..."
      initialSorting={[{ id: 'maxProfiles', desc: false }]}
      initialColumnVisibility={INITIAL_COLUMN_VISIBILITY}
      emptyMessage="No subscriptions found"
      columnLabels={COLUMN_LABELS}
    />
  )
}
