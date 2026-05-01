import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface GenderSelectProps {
  value?: string | null
  onChange: (value: string) => void
  invalid?: boolean
}

export function GenderSelect({ value, onChange, invalid }: GenderSelectProps) {
  return (
    <Select value={value ?? ''} onValueChange={(v) => onChange(v || '')}>
      <SelectTrigger aria-invalid={invalid}>
        <SelectValue placeholder="Select" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="FEMALE">Female</SelectItem>
        <SelectItem value="MALE">Male</SelectItem>
      </SelectContent>
    </Select>
  )
}
