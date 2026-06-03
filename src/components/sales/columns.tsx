'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Undo2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { reverseSale } from '@/actions/sale.actions'

export type SaleRow = {
  id: number
  quantity: number
  reversedAt: Date | null
  createdAt: Date
  package:  { name: string; price: number; quantity: number; type: 'DIGITAL' | 'PHYSICAL' }
  tenant:   { name: string }
  soldBy:   { firstName: string; lastName: string }
}

function ActionsCell({ row, currentUserRole }: { row: { original: SaleRow }; currentUserRole: string }) {
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const sale = row.original

  if (currentUserRole !== 'SUPER_ADMIN' && currentUserRole !== 'OWNER') return null
  if (sale.reversedAt) return null

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
            className="text-amber-600 focus:text-amber-600"
            onSelect={() => setOpen(true)}
          >
            <Undo2 className="mr-2 h-4 w-4" />
            Reverse
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm reversal</DialogTitle>
            <DialogDescription>
              {sale.package.type === 'PHYSICAL'
                ? <>The sale of package &quot;{sale.package.name}&quot; to &quot;{sale.tenant.name}&quot; will be marked as reversed. Available license codes will be invalidated. Activated codes remain linked to their memorials. The record is kept for audit purposes.</>
                : <>The sale of package &quot;{sale.package.name}&quot; to &quot;{sale.tenant.name}&quot; will be marked as reversed and the QR codes will be returned to inventory. The record is kept for audit purposes.</>
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="outline"
              className="border-amber-500 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
              disabled={isPending}
              onClick={() => startTransition(async () => {
                const result = await reverseSale(sale.id)
                if (result?.error) toast.error(result.error)
                else { toast.success('Sale reversed successfully.'); setOpen(false) }
              })}
            >
              {isPending ? 'Reversing…' : 'Reverse sale'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
      cell: ({ row }) => (
        <span className={row.original.reversedAt ? 'opacity-40' : ''}>
          {date.format(new Date(row.original.createdAt))}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) =>
        row.original.reversedAt ? (
          <Badge variant="outline" className="text-muted-foreground">
            Reversed
          </Badge>
        ) : (
          <Badge variant="default">Active</Badge>
        ),
    },
    {
      id: 'customer',
      accessorFn: (row) => row.tenant.name,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
      cell: ({ row }) => (
        <span className={row.original.reversedAt ? 'opacity-40 line-through' : ''}>
          {row.original.tenant.name}
        </span>
      ),
    },
    {
      id: 'package',
      accessorFn: (row) => row.package.name,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Package" />,
      cell: ({ row }) => (
        <span className={row.original.reversedAt ? 'opacity-40' : ''}>
          {row.original.package.name}
        </span>
      ),
    },
    {
      accessorKey: 'quantity',
      header: ({ column }) => <DataTableColumnHeader column={column} title={<>Package<br/>Quantity</>} />,
      cell: ({ row }) => (
        <div className={`text-right ${row.original.reversedAt ? 'opacity-40' : ''}`}>
          {row.original.quantity}
        </div>
      ),
    },
    {
      id: 'totalSubscriptions',
      accessorFn: (row) => row.quantity * row.package.quantity,
      header: ({ column }) => <DataTableColumnHeader column={column} title={<>QR-Codes /<br/>Package</>} />,
      cell: ({ row }) => (
        <div className={`text-right ${row.original.reversedAt ? 'opacity-40' : ''}`}>
          {(row.original.quantity * row.original.package.quantity).toLocaleString('en-US')}
        </div>
      ),
    },
    {
      id: 'packagePrice',
      accessorFn: (row) => row.package.price,
      header: ({ column }) => <DataTableColumnHeader column={column} title={<>Package<br/>Price</>} />,
      cell: ({ row }) => (
        <div className={`text-right ${row.original.reversedAt ? 'opacity-40' : ''}`}>
          {usd.format(row.original.package.price)}
        </div>
      ),
    },
    {
      id: 'subscriptionUnitPrice',
      accessorFn: (row) => row.package.price / row.package.quantity,
      header: ({ column }) => <DataTableColumnHeader column={column} title={<>QR-Code<br/>Un. Price</>} />,
      cell: ({ row }) => (
        <div className={`text-right ${row.original.reversedAt ? 'opacity-40' : ''}`}>
          {usd.format(row.original.package.price / row.original.package.quantity)}
        </div>
      ),
    },
    {
      id: 'totalPrice',
      accessorFn: (row) => row.quantity * row.package.price,
      header: ({ column }) => <DataTableColumnHeader column={column} title={<>Total Order<br/>Price</>} />,
      cell: ({ row }) => (
        <div className={`text-right ${row.original.reversedAt ? 'opacity-40' : ''}`}>
          {usd.format(row.original.quantity * row.original.package.price)}
        </div>
      ),
    },
    {
      id: 'seller',
      accessorFn: (row) => `${row.soldBy.firstName} ${row.soldBy.lastName}`,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Seller" />,
      cell: ({ row }) => (
        <div className={`flex flex-col leading-tight ${row.original.reversedAt ? 'opacity-40' : ''}`}>
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
