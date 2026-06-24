'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Undo2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@genealogiq/ui/button'
import { Badge } from '@genealogiq/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@genealogiq/ui/dropdown-menu'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@genealogiq/ui/dialog'
import { DataTableColumnHeader } from '@genealogiq/ui/data-table-column-header'
import { reverseSale } from '@/actions/sale.actions'

// Loose translator type so getColumns can stay a plain function (not a hook).
// The caller (sales-data-table) passes useTranslations('Sales').
type Translator = (key: string, values?: Record<string, string | number | Date>) => string

export type SaleRow = {
  id: number
  quantity: number
  reversedAt: Date | null
  createdAt: Date
  package:  { name: string; price: number; quantity: number; type: 'DIGITAL' | 'PHYSICAL' }
  tenant:   { name: string }
  soldBy:   { firstName: string; lastName: string }
}

function ActionsCell({ row, currentUserRole, t }: { row: { original: SaleRow }; currentUserRole: string; t: Translator }) {
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
            <span className="sr-only">{t('actions.openMenu')}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-amber-600 focus:text-amber-600"
            onSelect={() => setOpen(true)}
          >
            <Undo2 className="mr-2 h-4 w-4" />
            {t('actions.reverse')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('reverse.title')}</DialogTitle>
            <DialogDescription>
              {sale.package.type === 'PHYSICAL'
                ? t('reverse.descriptionPhysical', { package: sale.package.name, customer: sale.tenant.name })
                : t('reverse.descriptionDigital', { package: sale.package.name, customer: sale.tenant.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('actions.cancel')}</Button>
            </DialogClose>
            <Button
              variant="outline"
              className="border-amber-500 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
              disabled={isPending}
              onClick={() => startTransition(async () => {
                const result = await reverseSale(sale.id)
                if (result?.error) toast.error(result.error)
                else { toast.success(t('toasts.reversed')); setOpen(false) }
              })}
            >
              {isPending ? t('reverse.reversing') : t('reverse.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function getColumns(currentUserRole: string, t: Translator, locale: string): ColumnDef<SaleRow>[] {
  const currency = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' })
  const date     = new Intl.DateTimeFormat(locale, { dateStyle: 'short' })

  return [
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.date')} />,
      cell: ({ row }) => (
        <span className={row.original.reversedAt ? 'opacity-40' : ''}>
          {date.format(new Date(row.original.createdAt))}
        </span>
      ),
    },
    {
      id: 'status',
      header: t('table.status'),
      cell: ({ row }) =>
        row.original.reversedAt ? (
          <Badge variant="outline" className="text-muted-foreground">
            {t('status.reversed')}
          </Badge>
        ) : (
          <Badge variant="default">{t('status.active')}</Badge>
        ),
    },
    {
      id: 'customer',
      accessorFn: (row) => row.tenant.name,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.customer')} />,
      cell: ({ row }) => (
        <span className={row.original.reversedAt ? 'opacity-40 line-through' : ''}>
          {row.original.tenant.name}
        </span>
      ),
    },
    {
      id: 'package',
      accessorFn: (row) => row.package.name,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.package')} />,
      cell: ({ row }) => (
        <span className={row.original.reversedAt ? 'opacity-40' : ''}>
          {row.original.package.name}
        </span>
      ),
    },
    {
      accessorKey: 'quantity',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.quantity')} />,
      cell: ({ row }) => (
        <div className={`text-right ${row.original.reversedAt ? 'opacity-40' : ''}`}>
          {row.original.quantity}
        </div>
      ),
    },
    {
      id: 'totalSubscriptions',
      accessorFn: (row) => row.quantity * row.package.quantity,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.totalSubscriptions')} />,
      cell: ({ row }) => (
        <div className={`text-right ${row.original.reversedAt ? 'opacity-40' : ''}`}>
          {(row.original.quantity * row.original.package.quantity).toLocaleString(locale)}
        </div>
      ),
    },
    {
      id: 'packagePrice',
      accessorFn: (row) => row.package.price,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.packagePrice')} />,
      cell: ({ row }) => (
        <div className={`text-right ${row.original.reversedAt ? 'opacity-40' : ''}`}>
          {currency.format(row.original.package.price)}
        </div>
      ),
    },
    {
      id: 'subscriptionUnitPrice',
      accessorFn: (row) => row.package.price / row.package.quantity,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.subscriptionUnitPrice')} />,
      cell: ({ row }) => (
        <div className={`text-right ${row.original.reversedAt ? 'opacity-40' : ''}`}>
          {currency.format(row.original.package.price / row.original.package.quantity)}
        </div>
      ),
    },
    {
      id: 'totalPrice',
      accessorFn: (row) => row.quantity * row.package.price,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.totalPrice')} />,
      cell: ({ row }) => (
        <div className={`text-right ${row.original.reversedAt ? 'opacity-40' : ''}`}>
          {currency.format(row.original.quantity * row.original.package.price)}
        </div>
      ),
    },
    {
      id: 'seller',
      accessorFn: (row) => `${row.soldBy.firstName} ${row.soldBy.lastName}`,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.seller')} />,
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
      cell: ({ row }) => <ActionsCell row={row} currentUserRole={currentUserRole} t={t} />,
    },
  ]
}
