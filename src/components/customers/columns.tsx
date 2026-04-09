'use client'

import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { toggleCustomerActive, deleteCustomer } from '@/actions/customer.actions'

export type CustomerRow = {
  id: string
  firstName: string
  lastName: string
  email: string
  isActive: boolean
  createdAt: Date
  category: { id: string; name: string } | null
}

function ActionsCell({ row }: { row: { original: CustomerRow } }) {
  const [isPending, startTransition] = useTransition()
  const customer = row.original
  const fullName = `${customer.firstName} ${customer.lastName}`

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
          <Link href={`/customers/${customer.id}`}>Editar</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => startTransition(async () => {
            const result = await toggleCustomerActive(customer.id)
            if (result?.error) toast.error(result.error)
            else toast.success(customer.isActive ? 'Cliente desativado.' : 'Cliente reativado.')
          })}
        >
          {customer.isActive ? 'Desativar' : 'Reativar'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <ConfirmDeleteDialog
          isPending={isPending}
          description={`O cliente "${fullName}" será excluído permanentemente.`}
          onConfirm={() => startTransition(async () => {
            const result = await deleteCustomer(customer.id)
            if (result?.error) toast.error(result.error)
            else toast.success('Cliente excluído com sucesso.')
          })}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const customerColumns: ColumnDef<CustomerRow>[] = [
  {
    id: 'name',
    accessorFn: (row) => `${row.firstName} ${row.lastName}`,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nome" />,
    cell: ({ row }) => (
      <Link href={`/customers/${row.original.id}`} className="hover:underline">
        {row.original.firstName} {row.original.lastName}
      </Link>
    ),
  },
  {
    id: 'category',
    accessorFn: (row) => row.category?.name ?? '',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Categoria" />,
    cell: ({ row }) => row.original.category?.name ?? '—',
  },
  {
    accessorKey: 'email',
    header: ({ column }) => <DataTableColumnHeader column={column} title="E-mail" />,
    cell: ({ row }) => row.original.email,
  },
  {
    accessorKey: 'isActive',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) =>
      row.original.isActive ? (
        <Badge variant="default">Ativo</Badge>
      ) : (
        <Badge variant="destructive">Inativo</Badge>
      ),
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Criado em" />,
    cell: ({ row }) =>
      new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(row.original.createdAt),
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => <ActionsCell row={row} />,
  },
]
