"use client"

import { useState } from "react"
import { type Control, type FieldErrors, type UseFormSetValue, useWatch } from "react-hook-form"
import { SearchIcon } from "lucide-react"
import { toast } from "sonner"
import { useLocale, useTranslations } from "next-intl"
import { lookupZip } from "@/lib/zipLookup"
import { maskCep, maskUsZip, maskMxZip, unmaskDigits } from "@/lib/masks"
import { COUNTRY_BY_ISO, getLocalizedCountries } from "@/consts/countries-data"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Button } from "@/components/ui/button"

// Postal-level only — the suggestions API never returns unit-level fields
// (number/complement) to avoid leaking other users' addresses (B1).
interface AddressSuggestion {
  zip: string
  street: string | null
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

function applyZipMask(iso: string, value: string): string {
  if (iso === "BR") return maskCep(value)
  if (iso === "US") return maskUsZip(value)
  if (iso === "MX") return maskMxZip(value)
  return value
}

function zipPlaceholder(iso: string): string {
  if (iso === "BR") return "00000-000"
  if (iso === "US") return "00000-0000"
  if (iso === "MX") return "00000"
  return ""
}

export function AddressSection({ control, setValue, errors, prefix }: AddressSectionProps) {
  const locale = useLocale()
  const t = useTranslations("Common")
  const countryOptions = getLocalizedCountries(locale)
  const [isSearching, setIsSearching] = useState(false)
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])

  const country: string = useWatch({ control, name: `${prefix}.country` }) ?? "BR"
  const zip: string     = useWatch({ control, name: `${prefix}.zip` })     ?? ""

  const countryData = COUNTRY_BY_ISO[country]
  const states = countryData?.states ?? []
  const zipSupported = !!countryData?.zipProvider

  async function handleZipSearch() {
    const digits = unmaskDigits(zip)
    if (!digits) return
    const lookupZipValue = (country === "US" || country === "MX") ? digits.slice(0, 5) : digits
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
        toast.error(t("address.zipNotFound"))
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("address.lookupError"))
    } finally {
      setIsSearching(false)
    }
  }

  function applySuggestion(s: AddressSuggestion) {
    setValue(`${prefix}.zip`,          s.zip ?? "")
    setValue(`${prefix}.street`,       s.street ?? "")
    // number/complement are deliberately not autofilled (not returned by the API
    // for privacy) — the user enters their own unit details.
    setValue(`${prefix}.neighborhood`, s.neighborhood ?? "")
    setValue(`${prefix}.city`,         s.city ?? "")
    setValue(`${prefix}.state`,        s.state ?? "")
    setValue(`${prefix}.country`,      s.country ?? "BR")
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
        <FieldLabel>{t("address.country")}</FieldLabel>
        <Select
          value={country}
          onValueChange={(val) => {
            setValue(`${prefix}.country`, val)
            setValue(`${prefix}.state`, "")
            setValue(`${prefix}.zip`, "")
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("address.selectPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {countryOptions.map((c) => (
              <SelectItem key={c.iso} value={c.iso}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* ZIP */}
      <Field className="col-span-12 md:col-span-6">
        <FieldLabel>{t("address.zipCode")}</FieldLabel>
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
              <InputGroupButton onClick={handleZipSearch} disabled={isSearching} aria-label={t("address.lookupAria")}>
                <SearchIcon />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
        <FieldError errors={fieldError(`${prefix}.zip`)} />

        {/* DB address suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-2 rounded-md border border-border bg-background shadow-sm">
            <p className="px-3 pt-2 pb-1 text-xs text-muted-foreground">{t("address.suggestionsTitle")}</p>
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
                    {[s.street, s.neighborhood].filter(Boolean).join(", ")}
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
        <FieldLabel>{t("address.street")}</FieldLabel>
        <Input
          value={useWatch({ control, name: `${prefix}.street` }) ?? ""}
          onChange={(e) => { setValue(`${prefix}.street`, e.target.value); setSuggestions([]) }}
        />
        <FieldError errors={fieldError(`${prefix}.street`)} />
      </Field>

      {/* Number */}
      <Field className="col-span-12 md:col-span-2">
        <FieldLabel>{t("address.number")}</FieldLabel>
        <Input
          value={useWatch({ control, name: `${prefix}.number` }) ?? ""}
          onChange={(e) => setValue(`${prefix}.number`, e.target.value)}
        />
      </Field>

      {/* Complement */}
      <Field className="col-span-12 md:col-span-6">
        <FieldLabel>{t("address.complement")}</FieldLabel>
        <Input
          value={useWatch({ control, name: `${prefix}.complement` }) ?? ""}
          onChange={(e) => setValue(`${prefix}.complement`, e.target.value)}
        />
      </Field>

      {/* Neighborhood */}
      <Field className="col-span-12 md:col-span-6">
        <FieldLabel>{t("address.neighborhood")}</FieldLabel>
        <Input
          value={useWatch({ control, name: `${prefix}.neighborhood` }) ?? ""}
          onChange={(e) => setValue(`${prefix}.neighborhood`, e.target.value)}
        />
      </Field>

      {/* City */}
      <Field className="col-span-12 md:col-span-6">
        <FieldLabel>{t("address.city")}</FieldLabel>
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
  const t = useTranslations("Common")
  const value = useWatch({ control, name: `${prefix}.state` }) ?? ""
  return (
    <Field className="col-span-12 md:col-span-6">
      <FieldLabel>{t("address.state")}</FieldLabel>
      {states.length > 0 ? (
        <Select value={value} onValueChange={(val) => setValue(`${prefix}.state`, val)}>
          <SelectTrigger>
            <SelectValue placeholder={t("address.selectPlaceholder")} />
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
