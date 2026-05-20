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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { toggleDiscountCouponActive } from '@/actions/discount-coupon.actions'

export type DiscountCouponRow = {
  id:               string
  code:             string
  description:      string | null
  discountType:     string
  discountValue:    number
  duration:         string
  durationInMonths: number | null
  maxRedemptions:   number | null
  redeemBy:         Date | null
  isActive:         boolean
  createdAt:        Date
}

const dateFmt = new Intl.DateTimeFormat('en-US', { dateStyle: 'short' })

function formatDiscount(row: DiscountCouponRow) {
  return row.discountType === 'percent'
    ? `${row.discountValue}% off`
    : `$${row.discountValue.toFixed(2)} off`
}

function formatDuration(row: DiscountCouponRow) {
  if (row.duration === 'once')     return 'Once'
  if (row.duration === 'forever')  return 'Forever'
  return `${row.durationInMonths ?? '?'} months`
}

function ActionsCell({ row }: { row: { original: DiscountCouponRow } }) {
  const [isPending, startTransition] = useTransition()
  const coupon = row.original

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isPending}>
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/sales/discount-coupons/${coupon.id}`}>Edit description</Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => startTransition(async () => {
            const result = await toggleDiscountCouponActive(coupon.id)
            if ('error' in result) toast.error(result.error)
            else toast.success(result.success)
          })}
        >
          {coupon.isActive ? 'Deactivate' : 'Reactivate'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function getColumns(_currentUserRole: string): ColumnDef<DiscountCouponRow>[] {
  return [
    {
      accessorKey: 'code',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
      cell: ({ row }) => (
        <Link href={`/sales/discount-coupons/${row.original.id}`} className="font-mono hover:underline">
          {row.original.code}
        </Link>
      ),
    },
    {
      accessorKey: 'description',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
      cell: ({ row }) => row.original.description ?? '—',
    },
    {
      id: 'discount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Discount" />,
      cell: ({ row }) => formatDiscount(row.original),
    },
    {
      id: 'duration',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Duration" />,
      cell: ({ row }) => formatDuration(row.original),
    },
    {
      accessorKey: 'maxRedemptions',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Max uses" />,
      cell: ({ row }) => row.original.maxRedemptions ?? 'Unlimited',
    },
    {
      accessorKey: 'redeemBy',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Expires" />,
      cell: ({ row }) => row.original.redeemBy ? dateFmt.format(row.original.redeemBy) : 'Never',
    },
    {
      accessorKey: 'isActive',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) =>
        row.original.isActive
          ? <Badge variant="default">Active</Badge>
          : <Badge variant="destructive">Inactive</Badge>,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created at" />,
      cell: ({ row }) => dateFmt.format(row.original.createdAt),
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => <ActionsCell row={row} />,
    },
  ]
}
