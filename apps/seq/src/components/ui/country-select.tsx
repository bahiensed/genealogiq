'use client'

import { useLocale } from 'next-intl'
import { getLocalizedCountries } from '@genealogiq/core'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@genealogiq/ui/select'

interface CountrySelectProps {
  value?: string | null
  onChange: (value: string) => void
  invalid?: boolean
  placeholder?: string
}

export function CountrySelect({ value, onChange, invalid, placeholder = 'Select' }: CountrySelectProps) {
  // Stored value stays the ISO code; only the label is localized + reordered.
  const countries = getLocalizedCountries(useLocale())
  return (
    <Select value={value ?? ''} onValueChange={onChange}>
      <SelectTrigger aria-invalid={invalid}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {countries.map((c) => (
          <SelectItem key={c.iso} value={c.iso}>{c.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
