'use client'

import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@genealogiq/ui/badge'
import { DataTableColumnHeader } from '@genealogiq/ui/data-table-column-header'
import { formatGenCode } from '@/lib/gen-code'
import type { LicenseRow } from '@/queries/licenses'

// Loose translator type so buildLicenseColumns can stay a plain function (not a hook).
// The caller (licenses-data-table) passes useTranslations('Licenses').
type Translator = (key: string, values?: Record<string, string | number | Date>) => string

function formatDate(d: Date | null | undefined, locale: string): string {
  if (!d) return '—'
  return new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeZone: 'UTC' }).format(new Date(d))
}

const STATUS_STYLE: Record<string, { variant: 'default' | 'secondary' | 'outline'; cls: string }> = {
  AVAILABLE: { variant: 'secondary', cls: '' },
  SOLD:      { variant: 'outline', cls: 'text-amber-600 border-amber-500/40' },
  ACTIVATED: { variant: 'default', cls: '' },
}

function CopyButton({ text, label }: { text: string; label: string }) {
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
      title={label}
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  )
}

export function buildLicenseColumns(appUrl: string, t: Translator, locale: string): ColumnDef<LicenseRow>[] {
  return [
    {
      accessorKey: 'genCode',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.code')} />,
      cell: ({ row }) => (
        <Link
          href={`/inventory/physical-qr/${row.original.genCode}`}
          className="font-mono text-sm tracking-wider hover:underline"
        >
          {formatGenCode(row.original.genCode)}
        </Link>
      ),
    },
    {
      id: 'url',
      header: () => t('table.url'),
      cell: ({ row }) => {
        const url = `${appUrl}/qr/${row.original.genCode}`
        return (
          <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
            <span className="truncate max-w-[200px]">{url}</span>
            <CopyButton text={url} label={t('actions.copyUrl')} />
          </span>
        )
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.status')} />,
      cell: ({ row }) => {
        const s = STATUS_STYLE[row.original.status] ?? STATUS_STYLE.AVAILABLE
        return <Badge variant={s.variant} className={s.cls}>{t(`status.${row.original.status}`)}</Badge>
      },
    },
    {
      id: 'printed',
      header: () => t('table.printed'),
      cell: ({ row }) =>
        row.original.printedAt ? (
          <span className="inline-flex items-center gap-1 text-emerald-600">
            <Check className="h-3.5 w-3.5" /> {formatDate(row.original.printedAt, locale)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'soldTo',
      header: () => t('table.soldTo'),
      cell: ({ row }) => {
        const r = row.original
        const name = r.soldToName ?? (r.soldToAppUser ? `${r.soldToAppUser.firstName} ${r.soldToAppUser.lastName}` : null)
        if (!name) return <span className="text-muted-foreground">—</span>
        return (
          <span className="flex items-center gap-1.5">
            {name}
            {r.soldVia && <Badge variant="outline" className="text-[10px]">{t(`soldVia.${r.soldVia}`)}</Badge>}
          </span>
        )
      },
    },
    {
      id: 'memorial',
      header: () => t('table.memorial'),
      cell: ({ row }) => {
        const u = row.original.appUser
        return u ? `${u.firstName} ${u.lastName}` : <span className="text-muted-foreground">—</span>
      },
    },
  ]
}
