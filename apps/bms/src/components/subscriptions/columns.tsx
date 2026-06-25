'use client'

import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@genealogiq/ui/button'
import { Badge } from '@genealogiq/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@genealogiq/ui/dropdown-menu'
import { DataTableColumnHeader } from '@genealogiq/ui/data-table-column-header'
import { ConfirmDeleteDialog } from '@genealogiq/ui/confirm-delete-dialog'
import { toggleSubscriptionActive, deleteSubscription } from '@/actions/subscription.actions'

// Loose translator type so getColumns can stay a plain function (not a hook).
// The caller (subscriptions-data-table) passes useTranslations('Subscriptions').
type Translator = (key: string, values?: Record<string, string | number | Date>) => string

export type SubscriptionRow = {
  id: string
  code: string
  name: string
  description: string | null
  maxProfiles: number
  termLength: number
  price: number
  treeMaxMembers: number
  bioMaxChars: number
  bioMaxImages: number
  galleryMaxImages: number
  galleryMaxVideos: number
  geolocationFullAccess: boolean
  qrCodeAccess: boolean
  isActive: boolean
  createdAt: Date
}

function ActionsCell({ row, currentUserRole, t }: { row: { original: SubscriptionRow }; currentUserRole: string; t: Translator }) {
  const [isPending, startTransition] = useTransition()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const subscription = row.original

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
          <DropdownMenuItem asChild>
            <Link href={`/subscriptions/${subscription.id}`}>{t('actions.edit')}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => startTransition(async () => {
              const result = await toggleSubscriptionActive(subscription.id)
              if (!result.ok) toast.error(result.message)
              else toast.success(subscription.isActive ? t('toasts.deactivated') : t('toasts.reactivated'))
            })}
          >
            {subscription.isActive ? t('actions.deactivate') : t('actions.reactivate')}
          </DropdownMenuItem>
          {(currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'OWNER') && (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setDeleteOpen(true)}
            >
              {t('actions.delete')}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {(currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'OWNER') && (
        <ConfirmDeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          isPending={isPending}
          description={t('toasts.deleteConfirm', { name: subscription.name })}
          onConfirm={() => startTransition(async () => {
            const result = await deleteSubscription(subscription.id)
            if (!result.ok) toast.error(result.message)
            else { toast.success(t('toasts.deleted')); setDeleteOpen(false) }
          })}
        />
      )}
    </>
  )
}

export function getColumns(currentUserRole: string, t: Translator, locale: string): ColumnDef<SubscriptionRow>[] {
  const currency = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' })

  return [
    {
      accessorKey: 'code',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.code')} />,
      cell: ({ row }) => (
        <code className="text-xs font-mono bg-muted/60 px-1.5 py-0.5 rounded">{row.original.code}</code>
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.name')} />,
      cell: ({ row }) => (
        <Link href={`/subscriptions/${row.original.id}`} className="hover:underline">
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: 'maxProfiles',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.maxProfiles')} className="justify-end" />,
      cell: ({ row }) => <div className="text-right">{row.original.maxProfiles}</div>,
    },
    {
      accessorKey: 'bioMaxChars',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.bioMaxChars')} className="justify-end" />,
      cell: ({ row }) => <div className="text-right">{row.original.bioMaxChars}</div>,
    },
    {
      accessorKey: 'bioMaxImages',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.bioMaxImages')} className="justify-end" />,
      cell: ({ row }) => <div className="text-right">{row.original.bioMaxImages}</div>,
    },
    {
      accessorKey: 'galleryMaxImages',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.galleryMaxImages')} className="justify-end" />,
      cell: ({ row }) => <div className="text-right">{row.original.galleryMaxImages}</div>,
    },
    {
      accessorKey: 'galleryMaxVideos',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.galleryMaxVideos')} className="justify-end" />,
      cell: ({ row }) => <div className="text-right">{row.original.galleryMaxVideos}</div>,
    },
    {
      accessorKey: 'geolocationFullAccess',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.geo')} />,
      cell: ({ row }) => (
        <span className="text-xs">{row.original.geolocationFullAccess ? '✓' : '∅'}</span>
      ),
    },
    {
      accessorKey: 'qrCodeAccess',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.qrCode')} />,
      cell: ({ row }) => (
        <span className="text-xs">{row.original.qrCodeAccess ? '✓' : '∅'}</span>
      ),
    },
    {
      accessorKey: 'termLength',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.term')} className="justify-end" />,
      cell: ({ row }) => (
        <div className="text-right">
          {row.original.termLength === 0 ? <span title={t('lifetime')} className="text-base leading-none">∞</span> : row.original.termLength}
        </div>
      ),
    },
    {
      accessorKey: 'price',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.price')} className="justify-end" />,
      cell: ({ row }) => (
        <div className="text-right">
          {row.original.price === 0 ? t('free') : currency.format(row.original.price)}
        </div>
      ),
    },
    {
      accessorKey: 'isActive',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.status')} />,
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge variant="default">{t('status.active')}</Badge>
        ) : (
          <Badge variant="destructive">{t('status.inactive')}</Badge>
        ),
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
      cell: ({ row }) => <ActionsCell row={row} currentUserRole={currentUserRole} t={t} />,
    },
  ]
}
