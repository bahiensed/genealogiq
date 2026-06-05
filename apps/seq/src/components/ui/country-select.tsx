import { COUNTRIES } from '@/constants/countries'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const PRIORITY_CODES = ['BR', 'MX', 'US']
const priority = COUNTRIES.filter((c) => PRIORITY_CODES.includes(c.code))
const rest = COUNTRIES
  .filter((c) => !PRIORITY_CODES.includes(c.code))
  .sort((a, b) => a.name.localeCompare(b.name))
const ORDERED_COUNTRIES = [...priority, ...rest]

interface CountrySelectProps {
  value?: string | null
  onChange: (value: string) => void
  invalid?: boolean
  placeholder?: string
}

export function CountrySelect({ value, onChange, invalid, placeholder = 'Select' }: CountrySelectProps) {
  return (
    <Select value={value ?? ''} onValueChange={onChange}>
      <SelectTrigger aria-invalid={invalid}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {ORDERED_COUNTRIES.map((c) => (
          <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
