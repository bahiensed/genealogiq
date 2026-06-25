'use client'

import { useTranslations, useLocale } from 'next-intl'
import { DataTable } from '@genealogiq/ui/data-table'
import { getColumns, type UserRow } from './columns'

interface UsersDataTableProps {
  currentUserId: string
  currentUserRole: string
  data: UserRow[]
}

export function UsersDataTable({ currentUserId, currentUserRole, data }: UsersDataTableProps) {
  const t = useTranslations('Users')
  const locale = useLocale()

  const columnLabels: Record<string, string> = {
    name:      t('table.name'),
    email:     t('table.email'),
    role:      t('table.role'),
    isActive:  t('table.status'),
    createdAt: t('table.createdAt'),
  }

  return (
    <DataTable
      columns={getColumns({ currentUserId, currentUserRole }, t, locale)}
      data={data}
      emptyMessage={t('table.empty')}
      columnLabels={columnLabels}
    />
  )
}
