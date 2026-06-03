'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { formatGenCode } from '@/lib/gen-code'
import type { LicenseRow } from '@/queries/licenses'

function formatDate(d: Date | null | undefined): string {
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'short', timeZone: 'UTC' }).format(new Date(d))
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
      title="Copy URL"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  )
}

export function buildLicenseColumns(appUrl: string): ColumnDef<LicenseRow>[] {
  return [
    {
      accessorKey: 'genCode',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
      cell: ({ row }) => (
        <span className="font-mono text-sm tracking-wider">
          {formatGenCode(row.original.genCode)}
        </span>
      ),
    },
    {
      id: 'url',
      header: 'URL',
      cell: ({ row }) => {
        const url = `${appUrl}/qr/${row.original.genCode}`
        return (
          <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
            <span className="truncate max-w-[220px]">{url}</span>
            <CopyButton text={url} />
          </span>
        )
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'ACTIVATED' ? 'default' : 'secondary'}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: 'activatedAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Activated" />,
      cell: ({ row }) => formatDate(row.original.activatedAt),
    },
    {
      id: 'memorial',
      header: 'Memorial',
      cell: ({ row }) => {
        const u = row.original.appUser
        return u ? `${u.firstName} ${u.lastName}` : '—'
      },
    },
  ]
}
