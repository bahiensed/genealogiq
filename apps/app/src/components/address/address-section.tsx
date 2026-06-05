"use client"

import { useState } from "react"
import { type Control, type FieldErrors, type UseFormSetValue, useWatch } from "react-hook-form"
import { SearchIcon } from "lucide-react"
import { toast } from "sonner"
import { lookupZip } from "@/lib/zipLookup"
import { maskCep, maskUsZip, maskMxZip, unmaskDigits } from "@/lib/masks"
import { COUNTRY_NAMES, COUNTRY_BY_NAME } from "@/consts/countries-data"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Button } from "@/components/ui/button"

interface AddressSuggestion {
  zip: string
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  country: string | null
}

interface AddressSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: UseFormSetValue<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: FieldErrors<any>
  prefix: string
}

function applyZipMask(countryName: string, value: string): string {
  if (countryName === "Brazil") return maskCep(value)
  if (countryName === "United States") return maskUsZip(value)
  if (countryName === "Mexico") return maskMxZip(value)
  return value
}

function zipPlaceholder(countryName: string): string {
  if (countryName === "Brazil") return "00000-000"
  if (countryName === "United States") return "00000-0000"
  if (countryName === "Mexico") return "00000"
  return ""
}

export function AddressSection({ control, setValue, errors, prefix }: AddressSectionProps) {
  const [isSearching, setIsSearching] = useState(false)
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])

  const country: string = useWatch({ control, name: `${prefix}.country` }) ?? "Brazil"
  const zip: string     = useWatch({ control, name: `${prefix}.zip` })     ?? ""

  const countryData = COUNTRY_BY_NAME[country]
  const states = countryData?.states ?? []
  const zipSupported = !!countryData?.zipProvider

  async function handleZipSearch() {
    const digits = unmaskDigits(zip)
    if (!digits) return
    const lookupZipValue = (country === "United States" || country === "Mexico") ? digits.slice(0, 5) : digits
    setIsSearching(true)
    setSuggestions([])
    try {
      const [zipResult, suggestionsRes] = await Promise.all([
        lookupZip(country, lookupZipValue).catch(() => null),
        fetch(`/api/address/suggestions?zip=${encodeURIComponent(digits)}`).then((r) =>
          r.ok ? r.json() : [],
        ),
      ])

      if (zipResult) {
        setValue(`${prefix}.street`,       zipResult.street)
        setValue(`${prefix}.neighborhood`, zipResult.neighborhood)
        setValue(`${prefix}.city`,         zipResult.city)
        setValue(`${prefix}.state`,        zipResult.state)
        setValue(`${prefix}.country`,      zipResult.country)
      }

      if (Array.isArray(suggestionsRes) && suggestionsRes.length > 0) {
        setSuggestions(suggestionsRes)
      }

      if (!zipResult && (!Array.isArray(suggestionsRes) || suggestionsRes.length === 0)) {
        toast.error("ZIP not found")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to look up ZIP/postal code")
    } finally {
      setIsSearching(false)
    }
  }

  function applySuggestion(s: AddressSuggestion) {
    setValue(`${prefix}.zip`,          s.zip ?? "")
    setValue(`${prefix}.street`,       s.street ?? "")
    setValue(`${prefix}.number`,       s.number ?? "")
    setValue(`${prefix}.complement`,   s.complement ?? "")
    setValue(`${prefix}.neighborhood`, s.neighborhood ?? "")
    setValue(`${prefix}.city`,         s.city ?? "")
    setValue(`${prefix}.state`,        s.state ?? "")
    setValue(`${prefix}.country`,      s.country ?? "Brazil")
    setSuggestions([])
  }

  function fieldError(name: string) {
    const parts = name.split(".")
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
            setValue(`${prefix}.state`, "")
            setValue(`${prefix}.zip`, "")
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRY_NAMES.map((name) => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
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
              setSuggestions([])
            }}
            placeholder={zipPlaceholder(country)}
            disabled={!zipSupported && !zip}
          />
          {zipSupported && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton onClick={handleZipSearch} disabled={isSearching} aria-label="Look up address">
                <SearchIcon />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
        <FieldError errors={fieldError(`${prefix}.zip`)} />

        {/* DB address suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-2 rounded-md border border-border bg-background shadow-sm">
            <p className="px-3 pt-2 pb-1 text-xs text-muted-foreground">Addresses already on file:</p>
            <ul className="divide-y divide-border">
              {suggestions.map((s, i) => (
                <li key={i}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start rounded-none px-3 py-2 text-left text-sm h-auto"
                    onClick={() => applySuggestion(s)}
                  >
                    {[s.street, s.number].filter(Boolean).join(", ")}
                    {s.city ? ` – ${s.city}` : ""}
                    {s.state ? `, ${s.state}` : ""}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Field>

      {/* Street */}
      <Field className="col-span-12 md:col-span-10">
        <FieldLabel>Street:</FieldLabel>
        <Input
          value={useWatch({ control, name: `${prefix}.street` }) ?? ""}
          onChange={(e) => { setValue(`${prefix}.street`, e.target.value); setSuggestions([]) }}
        />
        <FieldError errors={fieldError(`${prefix}.street`)} />
      </Field>

      {/* Number */}
      <Field className="col-span-12 md:col-span-2">
        <FieldLabel>Number:</FieldLabel>
        <Input
          value={useWatch({ control, name: `${prefix}.number` }) ?? ""}
          onChange={(e) => setValue(`${prefix}.number`, e.target.value)}
        />
      </Field>

      {/* Complement */}
      <Field className="col-span-12 md:col-span-6">
        <FieldLabel>Complement:</FieldLabel>
        <Input
          value={useWatch({ control, name: `${prefix}.complement` }) ?? ""}
          onChange={(e) => setValue(`${prefix}.complement`, e.target.value)}
        />
      </Field>

      {/* Neighborhood */}
      <Field className="col-span-12 md:col-span-6">
        <FieldLabel>Neighborhood:</FieldLabel>
        <Input
          value={useWatch({ control, name: `${prefix}.neighborhood` }) ?? ""}
          onChange={(e) => setValue(`${prefix}.neighborhood`, e.target.value)}
        />
      </Field>

      {/* City */}
      <Field className="col-span-12 md:col-span-6">
        <FieldLabel>City:</FieldLabel>
        <Input
          value={useWatch({ control, name: `${prefix}.city` }) ?? ""}
          onChange={(e) => setValue(`${prefix}.city`, e.target.value)}
        />
      </Field>

      {/* State */}
      <StateField
        control={control}
        setValue={setValue}
        prefix={prefix}
        states={states}
      />
    </div>
  )
}

interface StateFieldProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: UseFormSetValue<any>
  prefix: string
  states: { code: string; name: string }[]
}

function StateField({ control, setValue, prefix, states }: StateFieldProps) {
  const value = useWatch({ control, name: `${prefix}.state` }) ?? ""
  return (
    <Field className="col-span-12 md:col-span-6">
      <FieldLabel>State / Province:</FieldLabel>
      {states.length > 0 ? (
        <Select value={value} onValueChange={(val) => setValue(`${prefix}.state`, val)}>
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
        <Input value={value} onChange={(e) => setValue(`${prefix}.state`, e.target.value)} />
      )}
    </Field>
  )
}
