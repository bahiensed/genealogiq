'use client'

import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog'
import { QrCodeDownload } from '@/components/ui/qr-code-download'
import { deleteDeceased } from '@/actions/deceased.actions'

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
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(d))
}

function ActionsCell({ row }: { row: { original: MemorializedRow } }) {
  const [isPending, startTransition] = useTransition()
  const profile = row.original
  const fullName = `${profile.firstName} ${profile.lastName}`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isPending}>
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Ações</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/memorialized/${profile.id}`}>Editar</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <ConfirmDeleteDialog
          isPending={isPending}
          description={`O perfil "${fullName}" será excluído permanentemente.`}
          onConfirm={() =>
            startTransition(async () => {
              const result = await deleteDeceased(profile.id)
              if (result?.error) toast.error(result.error)
              else toast.success('Perfil excluído com sucesso.')
            })
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const memorializedColumns: ColumnDef<MemorializedRow>[] = [
  {
    id: 'name',
    accessorFn: (row) => `${row.firstName} ${row.lastName}`,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nome" />,
    cell: ({ row }) => (
      <Link href={`/memorialized/${row.original.id}`} className="hover:underline">
        {row.original.firstName} {row.original.lastName}
      </Link>
    ),
  },
  {
    accessorKey: 'birthDate',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nascimento" />,
    cell: ({ row }) => formatDate(row.original.birthDate),
  },
  {
    accessorKey: 'deathDate',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Falecimento" />,
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
