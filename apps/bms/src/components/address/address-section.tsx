'use client'

import { useState } from 'react'
import { type Control, type FieldErrors, type UseFormSetValue, useWatch } from 'react-hook-form'
import { SearchIcon } from 'lucide-react'
import { toast } from 'sonner'
import { lookupZip } from '@/lib/zipLookup'
import { maskCep, maskUsZip, maskMxZip, unmaskDigits } from '@/lib/masks'
import { STATES_BY_COUNTRY } from '@/constants/states'
import { COUNTRIES } from '@genealogiq/core'
import { Field, FieldError, FieldLabel } from '@genealogiq/ui/field'
import { Input } from '@genealogiq/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@genealogiq/ui/select'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@genealogiq/ui/input-group'

interface AddressSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: UseFormSetValue<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: FieldErrors<any>
  prefix: string
}

function applyZipMask(country: string, value: string): string {
  if (country === 'BR') return maskCep(value)
  if (country === 'US') return maskUsZip(value)
  if (country === 'MX') return maskMxZip(value)
  return value
}

function zipPlaceholder(country: string): string {
  if (country === 'BR') return '00000-000'
  if (country === 'US') return '00000-0000'
  if (country === 'MX') return '00000'
  return ''
}

export function AddressSection({ control, setValue, errors, prefix }: AddressSectionProps) {
  const [isSearching, setIsSearching] = useState(false)

  const country: string    = useWatch({ control, name: `${prefix}.country` }) ?? 'BR'
  const zip: string        = useWatch({ control, name: `${prefix}.zip` })     ?? ''
  // Hoisted so the hook is called unconditionally (was inside the state ternary).
  const stateValue: string = useWatch({ control, name: `${prefix}.state` })   ?? ''

  const states = STATES_BY_COUNTRY[country] ?? []

  async function handleZipSearch() {
    const digits = unmaskDigits(zip)
    if (!digits) return
    // zippopotam.us requires exactly 5 digits for US/MX
    const lookupCode = (country === 'US' || country === 'MX') ? digits.slice(0, 5) : digits
    setIsSearching(true)
    try {
      const result = await lookupZip(country, lookupCode)
      setValue(`${prefix}.street`,       result.street)
      setValue(`${prefix}.neighborhood`, result.neighborhood)
      setValue(`${prefix}.city`,         result.city)
      setValue(`${prefix}.state`,        result.state)
      setValue(`${prefix}.country`,      result.country)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to look up ZIP/postal code')
    } finally {
      setIsSearching(false)
    }
  }

  function fieldError(name: string) {
    const parts = name.split('.')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let e: any = errors
    for (const part of parts) e = e?.[part]
    return e ? [e] : []
  }

  return (
    <div className="grid grid-cols-12 gap-4">

      {/* Country */}
      <Field className="col-span-12 md:col-span-6">
        <FieldLabel>Country:</FieldLabel>
        <Select
          value={country}
          onValueChange={(val) => {
            setValue(`${prefix}.country`, val)
            setValue(`${prefix}.state`, '')
            setValue(`${prefix}.zip`, '')
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.iso} value={c.iso}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* ZIP */}
      <Field className="col-span-12 md:col-span-6">
        <FieldLabel>ZIP Code:</FieldLabel>
        <InputGroup>
          <InputGroupInput
            value={applyZipMask(country, zip)}
            onChange={(e) => {
              const raw = unmaskDigits(e.target.value)
              setValue(`${prefix}.zip`, raw)
            }}
            placeholder={zipPlaceholder(country)}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton onClick={handleZipSearch} disabled={isSearching} aria-label="Look up address">
              <SearchIcon />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <FieldError errors={fieldError(`${prefix}.zip`)} />
      </Field>

      {/* Street */}
      <Field className="col-span-12 md:col-span-10">
        <FieldLabel>Street:</FieldLabel>
        <Input
          value={useWatch({ control, name: `${prefix}.street` }) ?? ''}
          onChange={(e) => setValue(`${prefix}.street`, e.target.value)}
        />
        <FieldError errors={fieldError(`${prefix}.street`)} />
      </Field>

      {/* Number */}
      <Field className="col-span-12 md:col-span-2">
        <FieldLabel>Number:</FieldLabel>
        <Input
          value={useWatch({ control, name: `${prefix}.number` }) ?? ''}
          onChange={(e) => setValue(`${prefix}.number`, e.target.value)}
        />
      </Field>

      {/* Complement */}
      <Field className="col-span-12 md:col-span-6">
        <FieldLabel>Complement:</FieldLabel>
        <Input
          value={useWatch({ control, name: `${prefix}.complement` }) ?? ''}
          onChange={(e) => setValue(`${prefix}.complement`, e.target.value)}
        />
      </Field>

      {/* Neighborhood */}
      <Field className="col-span-12 md:col-span-6">
        <FieldLabel>Neighborhood:</FieldLabel>
        <Input
          value={useWatch({ control, name: `${prefix}.neighborhood` }) ?? ''}
          onChange={(e) => setValue(`${prefix}.neighborhood`, e.target.value)}
        />
      </Field>

      {/* City */}
      <Field className="col-span-12 md:col-span-6">
        <FieldLabel>City:</FieldLabel>
        <Input
          value={useWatch({ control, name: `${prefix}.city` }) ?? ''}
          onChange={(e) => setValue(`${prefix}.city`, e.target.value)}
        />
      </Field>

      {/* State */}
      <Field className="col-span-12 md:col-span-6">
        <FieldLabel>State / Province:</FieldLabel>
        {states.length > 0 ? (
          <Select
            value={stateValue}
            onValueChange={(val) => setValue(`${prefix}.state`, val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {states.map((s) => (
                <SelectItem key={s.code} value={s.code}>{s.code} - {s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={stateValue}
            onChange={(e) => setValue(`${prefix}.state`, e.target.value)}
          />
        )}
      </Field>

    </div>
  )
}
