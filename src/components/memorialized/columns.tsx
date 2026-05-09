'use client'

import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { QrCodeDownload } from '@/components/ui/qr-code-download'

const BASE_URL = 'https://www.genealogiq.app'

export type MemorializedRow = {
  id:        string
  firstName: string
  lastName:  string
  birthDate: Date | null
  deathDate: Date | null
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(new Date(d))
}

function ActionsCell({ row }: { row: { original: MemorializedRow } }) {
  const profile = row.original

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/memorialized/${profile.id}`}>Edit</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const memorializedColumns: ColumnDef<MemorializedRow>[] = [
  {
    id: 'name',
    accessorFn: (row) => `${row.firstName} ${row.lastName}`,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => (
      <Link href={`/memorialized/${row.original.id}`} className="hover:underline">
        {row.original.firstName} {row.original.lastName}
      </Link>
    ),
  },
  {
    accessorKey: 'birthDate',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Birth date" />,
    cell: ({ row }) => formatDate(row.original.birthDate),
  },
  {
    accessorKey: 'deathDate',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Death date" />,
    cell: ({ row }) => formatDate(row.original.deathDate),
  },
  {
    id: 'qrcode',
    header: 'QR Code',
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => (
      <QrCodeDownload
        value={`${BASE_URL}/${row.original.id}`}
        filename={`qr-${row.original.firstName}-${row.original.lastName}`}
        previewSize={48}
      />
    ),
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => <ActionsCell row={row} />,
  },
]
