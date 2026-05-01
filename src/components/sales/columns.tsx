'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog'
import { deleteSale } from '@/actions/sale.actions'

export type SaleRow = {
  id: number
  quantity: number
  createdAt: Date
  package:  { name: string; price: number; quantity: number }
  tenant: { name: string }
  soldBy:   { firstName: string; lastName: string }
}

function ActionsCell({ row, currentUserRole }: { row: { original: SaleRow }; currentUserRole: string }) {
  const [isPending, startTransition] = useTransition()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const sale = row.original

  if (currentUserRole !== 'SUPER_ADMIN' && currentUserRole !== 'OWNER') return null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isPending}>
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        isPending={isPending}
        description={`The sale of package "${sale.package.name}" to "${sale.tenant.name}" will be deleted and QR codes will be returned to inventory.`}
        onConfirm={() => startTransition(async () => {
          const result = await deleteSale(sale.id)
          if (result?.error) toast.error(result.error)
          else { toast.success('Sale deleted successfully.'); setDeleteOpen(false) }
        })}
      />
    </>
  )
}

const usd  = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const date = new Intl.DateTimeFormat('en-US', { dateStyle: 'short' })

export function getColumns(currentUserRole: string): ColumnDef<SaleRow>[] {
  return [
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => date.format(new Date(row.original.createdAt)),
    },
    {
      id: 'customer',
      accessorFn: (row) => row.tenant.name,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
      cell: ({ row }) => row.original.tenant.name,
    },
    {
      id: 'package',
      accessorFn: (row) => row.package.name,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Package" />,
      cell: ({ row }) => row.original.package.name,
    },
    {
      accessorKey: 'quantity',
      header: ({ column }) => <DataTableColumnHeader column={column} title={<>Package<br/>Qtd.</>} />,
      cell: ({ row }) => <div className="text-right">{row.original.quantity}</div>,
    },
    {
      id: 'totalSubscriptions',
      accessorFn: (row) => row.quantity * row.package.quantity,
      header: ({ column }) => <DataTableColumnHeader column={column} title={<>QR-Codes /<br/>Package</>} />,
      cell: ({ row }) => <div className="text-right">{(row.original.quantity * row.original.package.quantity).toLocaleString('en-US')}</div>,
    },
    {
      id: 'packagePrice',
      accessorFn: (row) => row.package.price,
      header: ({ column }) => <DataTableColumnHeader column={column} title={<>Package<br/>Price</>} />,
      cell: ({ row }) => <div className="text-right">{usd.format(row.original.package.price)}</div>,
    },
    {
      id: 'subscriptionUnitPrice',
      accessorFn: (row) => row.package.price / row.package.quantity,
      header: ({ column }) => <DataTableColumnHeader column={column} title={<>QR-Code<br/>Un. Price</>} />,
      cell: ({ row }) => <div className="text-right">{usd.format(row.original.package.price / row.original.package.quantity)}</div>,
    },
    {
      id: 'totalPrice',
      accessorFn: (row) => row.quantity * row.package.price,
      header: ({ column }) => <DataTableColumnHeader column={column} title={<>Total Order<br/>Price</>} />,
      cell: ({ row }) => <div className="text-right">{usd.format(row.original.quantity * row.original.package.price)}</div>,
    },
    {
      id: 'seller',
      accessorFn: (row) => `${row.soldBy.firstName} ${row.soldBy.lastName}`,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Seller" />,
      cell: ({ row }) => (
        <div className="flex flex-col leading-tight">
          <span>{row.original.soldBy.firstName}</span>
          <span>{row.original.soldBy.lastName}</span>
        </div>
      ),
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => <ActionsCell row={row} currentUserRole={currentUserRole} />,
    },
  ]
}
