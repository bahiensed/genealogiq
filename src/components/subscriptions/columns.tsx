'use client'

import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog'
import { toggleSubscriptionActive, deleteSubscription } from '@/actions/subscription.actions'

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

function ActionsCell({ row, currentUserRole }: { row: { original: SubscriptionRow }; currentUserRole: string }) {
  const [isPending, startTransition] = useTransition()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const subscription = row.original

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
          <DropdownMenuItem asChild>
            <Link href={`/subscriptions/${subscription.id}`}>Edit</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => startTransition(async () => {
              const result = await toggleSubscriptionActive(subscription.id)
              if (result?.error) toast.error(result.error)
              else toast.success(subscription.isActive ? 'Subscription deactivated.' : 'Subscription reactivated.')
            })}
          >
            {subscription.isActive ? 'Deactivate' : 'Reactivate'}
          </DropdownMenuItem>
          {(currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'OWNER') && (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setDeleteOpen(true)}
            >
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {(currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'OWNER') && (
        <ConfirmDeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          isPending={isPending}
          description={`The subscription "${subscription.name}" will be permanently deleted.`}
          onConfirm={() => startTransition(async () => {
            const result = await deleteSubscription(subscription.id)
            if (result?.error) toast.error(result.error)
            else { toast.success('Subscription deleted successfully.'); setDeleteOpen(false) }
          })}
        />
      )}
    </>
  )
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function getColumns(currentUserRole: string): ColumnDef<SubscriptionRow>[] {
  return [
    {
      accessorKey: 'code',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
      cell: ({ row }) => (
        <code className="text-xs font-mono bg-muted/60 px-1.5 py-0.5 rounded">{row.original.code}</code>
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => (
        <Link href={`/subscriptions/${row.original.id}`} className="hover:underline">
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: 'maxProfiles',
      header: ({ column }) => <DataTableColumnHeader column={column} title={<>Max Memo<br/>Profiles</>} className="justify-end" />,
      cell: ({ row }) => <div className="text-right">{row.original.maxProfiles}</div>,
    },
    {
      accessorKey: 'termLength',
      header: ({ column }) => <DataTableColumnHeader column={column} title={<>Term Length<br/>in Months</>} className="justify-end" />,
      cell: ({ row }) => (
        <div className="text-right">
          {row.original.termLength === 0 ? <span title="Lifetime" className="text-base leading-none">∞</span> : row.original.termLength}
        </div>
      ),
    },
    {
      accessorKey: 'price',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Price" className="justify-end" />,
      cell: ({ row }) => (
        <div className="text-right">
          {row.original.price === 0 ? 'Free' : usd.format(row.original.price)}
        </div>
      ),
    },
    {
      accessorKey: 'treeMaxMembers',
      header: ({ column }) => <DataTableColumnHeader column={column} title={<>Tree<br/>Members</>} className="justify-end" />,
      cell: ({ row }) => <div className="text-right">{row.original.treeMaxMembers}</div>,
    },
    {
      accessorKey: 'galleryMaxImages',
      header: ({ column }) => <DataTableColumnHeader column={column} title={<>Gallery<br/>Images</>} className="justify-end" />,
      cell: ({ row }) => <div className="text-right">{row.original.galleryMaxImages}</div>,
    },
    {
      accessorKey: 'galleryMaxVideos',
      header: ({ column }) => <DataTableColumnHeader column={column} title={<>Gallery<br/>Videos</>} className="justify-end" />,
      cell: ({ row }) => <div className="text-right">{row.original.galleryMaxVideos}</div>,
    },
    {
      accessorKey: 'geolocationFullAccess',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Geo" />,
      cell: ({ row }) => (
        <span className="text-xs">{row.original.geolocationFullAccess ? '✓' : '—'}</span>
      ),
    },
    {
      accessorKey: 'qrCodeAccess',
      header: ({ column }) => <DataTableColumnHeader column={column} title="QR" />,
      cell: ({ row }) => (
        <span className="text-xs">{row.original.qrCodeAccess ? '✓' : '—'}</span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge variant="default">Active</Badge>
        ) : (
          <Badge variant="destructive">Inactive</Badge>
        ),
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created at" />,
      cell: ({ row }) =>
        new Intl.DateTimeFormat('en-US', { dateStyle: 'short' }).format(row.original.createdAt),
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => <ActionsCell row={row} currentUserRole={currentUserRole} />,
    },
  ]
}
