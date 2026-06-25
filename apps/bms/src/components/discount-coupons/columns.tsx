'use client'

import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@genealogiq/ui/button'
import { Badge } from '@genealogiq/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@genealogiq/ui/dropdown-menu'
import { DataTableColumnHeader } from '@genealogiq/ui/data-table-column-header'
import { toggleDiscountCouponActive } from '@/actions/discount-coupon.actions'

// Loose translator type so getColumns can stay a plain function (not a hook).
// The caller (discount-coupons-data-table) passes useTranslations('DiscountCoupons').
type Translator = (key: string, values?: Record<string, string | number | Date>) => string

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

function formatDiscount(row: DiscountCouponRow, t: Translator, locale: string) {
  return row.discountType === 'percent'
    ? t('discount.percent', { value: row.discountValue })
    : t('discount.amount', {
        value: new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(row.discountValue),
      })
}

function formatDuration(row: DiscountCouponRow, t: Translator) {
  if (row.duration === 'once')    return t('durationLabel.once')
  if (row.duration === 'forever') return t('durationLabel.forever')
  return t('durationLabel.repeating', { months: row.durationInMonths ?? '?' })
}

function ActionsCell({ row, t }: { row: { original: DiscountCouponRow }; t: Translator }) {
  const [isPending, startTransition] = useTransition()
  const coupon = row.original

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isPending}>
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">{t('actions.openMenu')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/sales/discount-coupons/${coupon.id}`}>{t('actions.editDescription')}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => startTransition(async () => {
            const result = await toggleDiscountCouponActive(coupon.id)
            if (!result.ok) toast.error(result.message)
            else toast.success(coupon.isActive ? t('toasts.deactivated') : t('toasts.reactivated'))
          })}
        >
          {coupon.isActive ? t('actions.deactivate') : t('actions.reactivate')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function getColumns(_currentUserRole: string, t: Translator, locale: string): ColumnDef<DiscountCouponRow>[] {
  return [
    {
      accessorKey: 'code',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.code')} />,
      cell: ({ row }) => (
        <Link href={`/sales/discount-coupons/${row.original.id}`} className="font-mono hover:underline">
          {row.original.code}
        </Link>
      ),
    },
    {
      accessorKey: 'description',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.description')} />,
      cell: ({ row }) => row.original.description ?? '—',
    },
    {
      id: 'discount',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.discount')} />,
      cell: ({ row }) => formatDiscount(row.original, t, locale),
    },
    {
      id: 'duration',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.duration')} />,
      cell: ({ row }) => formatDuration(row.original, t),
    },
    {
      accessorKey: 'maxRedemptions',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.maxUses')} />,
      cell: ({ row }) => row.original.maxRedemptions ?? t('table.unlimited'),
    },
    {
      accessorKey: 'redeemBy',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.expires')} />,
      cell: ({ row }) =>
        row.original.redeemBy
          ? new Intl.DateTimeFormat(locale, { dateStyle: 'short' }).format(row.original.redeemBy)
          : t('table.never'),
    },
    {
      accessorKey: 'isActive',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.status')} />,
      cell: ({ row }) =>
        row.original.isActive
          ? <Badge variant="default">{t('status.active')}</Badge>
          : <Badge variant="destructive">{t('status.inactive')}</Badge>,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.createdAt')} />,
      cell: ({ row }) =>
        new Intl.DateTimeFormat(locale, { dateStyle: 'short' }).format(row.original.createdAt),
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => <ActionsCell row={row} t={t} />,
    },
  ]
}
