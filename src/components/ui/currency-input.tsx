'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { maskUsdAmount } from '@/lib/masks'

interface CurrencyInputProps extends Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'> {
  value: number
  onChange: (value: number) => void
}

export function CurrencyInput({ value, onChange, ...props }: CurrencyInputProps) {
  const digits = value > 0 ? Math.round(value * 100).toString() : ''

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '').replace(/^0+/, '')
    onChange(raw ? parseInt(raw, 10) / 100 : 0)
  }

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      value={maskUsdAmount(digits)}
      onChange={handleChange}
    />
  )
}
