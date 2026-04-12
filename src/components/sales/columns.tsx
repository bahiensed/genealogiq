'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog'
import { deleteSale } from '@/actions/sale.actions'

export type SaleRow = {
  id: number
  quantity: number
  soldAt: Date
  package:  { name: string; price: number; quantity: number }
  customer: { name: string }
  soldBy:   { firstName: string; lastName: string }
}

function ActionsCell({ row }: { row: { original: SaleRow } }) {
  const [isPending, startTransition] = useTransition()
  const sale = row.original

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
        <ConfirmDeleteDialog
          isPending={isPending}
          description={`A venda do package "${sale.package.name}" para "${sale.customer.name}" será excluída e as licenças serão devolvidas ao inventário.`}
          onConfirm={() => startTransition(async () => {
            const result = await deleteSale(sale.id)
            if (result?.error) toast.error(result.error)
            else toast.success('Venda excluída com sucesso.')
          })}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const usd  = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })

export const saleColumns: ColumnDef<SaleRow>[] = [
  {
    accessorKey: 'soldAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    cell: ({ row }) => date.format(new Date(row.original.soldAt)),
  },
  {
    id: 'customer',
    accessorFn: (row) => row.customer.name,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
    cell: ({ row }) => row.original.customer.name,
  },
  {
    id: 'package',
    accessorFn: (row) => row.package.name,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Package Name" />,
    cell: ({ row }) => row.original.package.name,
  },
  {
    accessorKey: 'quantity',
    header: ({ column }) => <DataTableColumnHeader column={column} title={<>Package<br/>Qtd.</>} />,
    cell: ({ row }) => <div className="text-right">{row.original.quantity}</div>,
  },
  {
    id: 'totalLicenses',
    accessorFn: (row) => row.quantity * row.package.quantity,
    header: ({ column }) => <DataTableColumnHeader column={column} title={<>License<br/>Total Qtd.</>} />,
    cell: ({ row }) => <div className="text-right">{(row.original.quantity * row.original.package.quantity).toLocaleString('en-US')}</div>,
  },
  {
    id: 'packagePrice',
    accessorFn: (row) => row.package.price,
    header: ({ column }) => <DataTableColumnHeader column={column} title={<>Package<br/>Price</>} />,
    cell: ({ row }) => <div className="text-right">{usd.format(row.original.package.price)}</div>,
  },
  {
    id: 'licenseUnitPrice',
    accessorFn: (row) => row.package.price / row.package.quantity,
    header: ({ column }) => <DataTableColumnHeader column={column} title={<>License<br/>Un. Price</>} />,
    cell: ({ row }) => <div className="text-right">{usd.format(row.original.package.price / row.original.package.quantity)}</div>,
  },
  {
    id: 'totalPrice',
    accessorFn: (row) => row.quantity * row.package.price,
    header: ({ column }) => <DataTableColumnHeader column={column} title={<>Total<br/>Price</>} />,
    cell: ({ row }) => <div className="text-right">{usd.format(row.original.quantity * row.original.package.price)}</div>,
  },
  {
    id: 'seller',
    accessorFn: (row) => `${row.soldBy.firstName} ${row.soldBy.lastName}`,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Seller" />,
    cell: ({ row }) => `${row.original.soldBy.firstName} ${row.original.soldBy.lastName}`,
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => <ActionsCell row={row} />,
  },
]
