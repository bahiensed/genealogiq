'use client'

import { type Table } from '@tanstack/react-table'
import { useTranslations } from 'next-intl'
import { Settings2 } from 'lucide-react'

import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu'

export function DataTableViewOptions<TData>({
  table,
  columnLabels = {},
}: {
  table: Table<TData>
  columnLabels?: Record<string, string>
}) {
  const t = useTranslations('Common')
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto hidden h-8 lg:flex">
          <Settings2 />
          {t('dataTable.columns')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        {table
          .getAllColumns()
          .filter((col) => col.getCanHide())
          .map((col) => (
            <DropdownMenuCheckboxItem
              key={col.id}
              checked={col.getIsVisible()}
              onCheckedChange={(value) => col.toggleVisibility(!!value)}
            >
              {columnLabels[col.id] ?? col.id}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
