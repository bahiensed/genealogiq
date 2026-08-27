'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Check } from 'lucide-react'
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

// Matches the colors of the summary StatCards above the table: available is
// plain (no color override there either), sold is amber, activated is green.
const STATUS_STYLE: Record<string, string> = {
  AVAILABLE: '',
  SOLD:      'text-amber-600 border-amber-500/40',
  ACTIVATED: 'text-green-600 border-green-500/40',
}

export function buildLicenseColumns(t: Translator, locale: string): ColumnDef<LicenseRow>[] {
  return [
    {
      accessorKey: 'genCode',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.code')} />,
      cell: ({ row }) => (
        <span className="font-mono text-sm tracking-wider">{formatGenCode(row.original.genCode)}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.status')} />,
      cell: ({ row }) => (
        <Badge variant="outline" className={STATUS_STYLE[row.original.status] ?? STATUS_STYLE.AVAILABLE}>
          {t(`status.${row.original.status}`)}
        </Badge>
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
      id: 'activated',
      header: () => t('table.activated'),
      cell: ({ row }) =>
        row.original.activatedAt ? (
          <span className="inline-flex items-center gap-1 text-green-600">
            <Check className="h-3.5 w-3.5" /> {formatDate(row.original.activatedAt, locale)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
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
