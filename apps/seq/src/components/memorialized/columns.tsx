'use client'

import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@genealogiq/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@genealogiq/ui/dropdown-menu'
import { DataTableColumnHeader } from '@genealogiq/ui/data-table-column-header'

// Loose translator type so getColumns can stay a plain function (not a hook).
// The caller (memorialized-data-table) passes useTranslations('Memorialized').
type Translator = (key: string, values?: Record<string, string | number | Date>) => string

export type MemorializedRow = {
  id:        string
  firstName: string
  lastName:  string
  birthDate: Date | null
  deathDate: Date | null
}

function formatDate(d: Date | null | undefined, locale: string): string {
  if (!d) return '—'
  return new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeZone: 'UTC' }).format(new Date(d))
}

function ActionsCell({ row, t }: { row: { original: MemorializedRow }; t: Translator }) {
  const profile = row.original

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">{t('actions.openMenu')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/memorialized/${profile.id}`}>{t('actions.edit')}</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function getColumns(t: Translator, locale: string): ColumnDef<MemorializedRow>[] {
  return [
    {
      id: 'name',
      accessorFn: (row) => `${row.firstName} ${row.lastName}`,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.name')} />,
      cell: ({ row }) => (
        <Link href={`/memorialized/${row.original.id}`} className="hover:underline">
          {row.original.firstName} {row.original.lastName}
        </Link>
      ),
    },
    {
      accessorKey: 'birthDate',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.birthDate')} />,
      cell: ({ row }) => formatDate(row.original.birthDate, locale),
    },
    {
      accessorKey: 'deathDate',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.deathDate')} />,
      cell: ({ row }) => formatDate(row.original.deathDate, locale),
    },
    {
      id: 'qrcode',
      header: t('table.qrCode'),
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <Link href={`/memorialized/${row.original.id}`} className="text-sm font-medium text-primary hover:underline">
          {t('actions.download')}
        </Link>
      ),
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => <ActionsCell row={row} t={t} />,
    },
  ]
}
