'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'

interface MaskedInputProps extends Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'> {
  value: string
  onChange: (raw: string) => void
  maskFn: (value: string) => string
}

export function MaskedInput({ value, onChange, maskFn, ...props }: MaskedInputProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    onChange(raw)
  }

  return (
    <Input
      {...props}
      value={maskFn(value)}
      onChange={handleChange}
    />
  )
}
