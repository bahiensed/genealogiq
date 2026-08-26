'use client'

import { useMemo, useRef, useState } from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@genealogiq/ui/button'
import { Input } from '@genealogiq/ui/input'
import { cn } from '@/lib/utils'

export interface SearchableOption {
  value: string
  label: string
  /** Shown under the label — a tax id, a code, whatever tells two similar rows apart. */
  hint?: string
}

interface Props {
  options:     SearchableOption[]
  value:       string
  onChange:    (value: string) => void
  placeholder: string
  searchPlaceholder: string
  emptyMessage: string
  disabled?:   boolean
}

/**
 * A select you can type into.
 *
 * A plain <Select> is fine for four plans and unusable for four hundred
 * partners — which is what the customer list becomes. Built on Popover plus a
 * plain input rather than pulling in a combobox library: the filtering is one
 * `includes`, and a dependency would be more surface than the feature.
 *
 * Matching ignores case AND accents, because a partner typed as "Zafonatto"
 * should be findable by someone typing "zafonato" — the operator is looking for
 * a name they half remember, not running a query.
 */
export function SearchableSelect({
  options, value, onChange, placeholder, searchPlaceholder, emptyMessage, disabled,
}: Props) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value)

  const filtered = useMemo(() => {
    const needle = normalise(query)
    if (!needle) return options
    return options.filter(
      (o) => normalise(o.label).includes(needle) || normalise(o.hint ?? '').includes(needle),
    )
  }, [options, query])

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        // Reset on close so reopening does not present a stale filter over a
        // list that looks empty for no visible reason.
        if (!next) setQuery('')
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        onOpenAutoFocus={(e) => {
          // Land in the search box, not on the first row: the whole point is to
          // start typing.
          e.preventDefault()
          inputRef.current?.focus()
        }}
      >
        <div className="relative border-b">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="border-0 pl-9 shadow-none focus-visible:ring-0"
            // Enter picks the only remaining match — the common case after
            // typing three letters.
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filtered.length === 1) {
                e.preventDefault()
                onChange(filtered[0].value)
                setOpen(false)
              }
            }}
          />
        </div>

        <div className="max-h-64 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => { onChange(option.value); setOpen(false) }}
                className={cn(
                  'flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm',
                  'hover:bg-accent hover:text-accent-foreground',
                  option.value === value && 'bg-accent/50',
                )}
              >
                <Check
                  className={cn(
                    'mt-0.5 h-4 w-4 shrink-0',
                    option.value === value ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <span className="min-w-0">
                  <span className="block truncate">{option.label}</span>
                  {option.hint && (
                    <span className="block truncate text-xs text-muted-foreground">{option.hint}</span>
                  )}
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/** Lowercased and stripped of accents, so "zafonato" finds "Zafonatto". */
function normalise(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}
