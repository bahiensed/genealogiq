'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Search, X } from 'lucide-react'
import { createAppSale } from '@/actions/sale.actions'
import { maskCurrency, parseCurrencyDigits } from '@/lib/masks'
import { MaskedInput } from '@/components/ui/masked-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface AppUserResult {
  id:        string
  firstName: string
  lastName:  string
  email:     string
}

interface Subscription {
  id:          string
  name:        string
  description: string | null
}

interface SalesFormProps {
  subscriptions:   Subscription[]
  suggestedValue?: number | null
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function formatValueAsDigits(value: number): string {
  return String(Math.round(value * 100))
}

interface FieldErrors {
  appUser?:        string
  subscriptionId?: string
  value?:          string
}

export function SalesForm({ subscriptions, suggestedValue }: SalesFormProps) {
  const router = useRouter()

  const [query,          setQuery]          = useState('')
  const [results,        setResults]        = useState<AppUserResult[]>([])
  const [open,           setOpen]           = useState(false)
  const [selected,       setSelected]       = useState<AppUserResult | null>(null)
  const [subscriptionId, setSubscriptionId] = useState('')
  const [value,          setValue]          = useState(
    suggestedValue != null ? maskCurrency(formatValueAsDigits(suggestedValue)) : '',
  )

  const numericValue = parseCurrencyDigits(value)
  const isBelowSuggested = suggestedValue != null && numericValue > 0 && numericValue < suggestedValue
  const [fieldErrors,    setFieldErrors]    = useState<FieldErrors>({})
  const [serverError,    setServerError]    = useState<string | null>(null)
  const [confirmOpen,    setConfirmOpen]    = useState(false)
  const [isPending,      startTransition]   = useTransition()

  const dropdownRef = useRef<HTMLDivElement>(null)
  const formRef     = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/app-users?q=${encodeURIComponent(query)}`)
      const data: AppUserResult[] = await res.json()
      setResults(data)
      setOpen(data.length > 0)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function selectAppUser(u: AppUserResult) {
    setSelected(u)
    setQuery('')
    setResults([])
    setOpen(false)
    setFieldErrors((prev) => ({ ...prev, appUser: undefined }))
  }

  function clearSelected() {
    setSelected(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const errors: FieldErrors = {}
    if (!selected)        errors.appUser        = 'Select a customer.'
    if (!subscriptionId)  errors.subscriptionId = 'Select a subscription.'

    const numValue = parseCurrencyDigits(value)
    if (!value || numValue <= 0) {
      errors.value = 'Enter a valid amount.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setServerError(null)
      requestAnimationFrame(() => {
        formRef.current?.querySelector<HTMLElement>('[data-invalid="true"]')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      return
    }

    setFieldErrors({})
    setServerError(null)
    setConfirmOpen(true)
  }

  function handleConfirm() {
    setConfirmOpen(false)
    const customerId = selected!.id
    const numValue   = parseCurrencyDigits(value)
    startTransition(async () => {
      const result = await createAppSale(customerId, subscriptionId, numValue)
      if ('error' in result) {
        setServerError(result.error)
      } else {
        toast.success(result.success)
        router.push(`/customers/${customerId}#memorialized-profiles`)
      }
    })
  }

  return (
    <>
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-xl">
      <FieldGroup>
        {/* Customer search */}
        <Field data-invalid={!!fieldErrors.appUser || undefined}>
          <FieldLabel>Customer:</FieldLabel>
          {selected ? (
            <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <span className="flex-1">
                {selected.firstName} {selected.lastName}
                <span className="ml-2 text-muted-foreground">{selected.email}</span>
              </span>
              <button type="button" onClick={clearSelected} aria-label="Remove customer">
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Type name or email..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9"
                  autoComplete="off"
                  aria-invalid={!!fieldErrors.appUser}
                />
              </div>
              {open && (
                <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
                  {results.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-accent"
                      onMouseDown={() => selectAppUser(u)}
                    >
                      <span className="font-medium">{u.firstName} {u.lastName}</span>
                      <span className="text-muted-foreground">{u.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <FieldDescription>Who are you selling to?</FieldDescription>
          {fieldErrors.appUser && <FieldError>{fieldErrors.appUser}</FieldError>}
        </Field>

        {/* Subscription */}
        <Field data-invalid={!!fieldErrors.subscriptionId || undefined}>
          <FieldLabel>Bonus subscription:</FieldLabel>
          <Select value={subscriptionId} onValueChange={(v) => { setSubscriptionId(v); setFieldErrors((prev) => ({ ...prev, subscriptionId: undefined })) }}>
            <SelectTrigger aria-invalid={!!fieldErrors.subscriptionId}>
              <SelectValue placeholder="Select a subscription..." />
            </SelectTrigger>
            <SelectContent>
              {subscriptions.map((sub) => (
                <SelectItem key={sub.id} value={sub.id}>
                  {sub.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>The app subscription the customer will receive for free</FieldDescription>
          {fieldErrors.subscriptionId && <FieldError>{fieldErrors.subscriptionId}</FieldError>}
        </Field>

        {/* Amount */}
        <Field data-invalid={!!fieldErrors.value || undefined}>
          <FieldLabel>Total Amount:</FieldLabel>
          <MaskedInput
            maskFn={maskCurrency}
            value={value}
            onChange={(v) => { setValue(v); setFieldErrors((prev) => ({ ...prev, value: undefined })) }}
            placeholder="0.00"
            aria-invalid={!!fieldErrors.value}
          />
          <FieldDescription>The total price charged for the QR Codes.</FieldDescription>
          {suggestedValue != null && (
            isBelowSuggested
              ? (
                <p className="text-xs font-medium text-amber-600">
                  Below suggested {usd.format(suggestedValue)} (2× last package cost) — selling at a loss?
                </p>
              )
              : (
                <p className="text-xs text-muted-foreground">
                  Suggested: {usd.format(suggestedValue)} (2× last package cost)
                </p>
              )
          )}
          {fieldErrors.value && <FieldError>{fieldErrors.value}</FieldError>}
        </Field>
      </FieldGroup>

      {serverError && <FieldError>{serverError}</FieldError>}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Registering...' : 'Complete Sale'}
        </Button>
      </div>
    </form>

    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm sale</DialogTitle>
          <DialogDescription>
            The sale will be registered and a QR code will be removed from inventory. Confirm?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? 'Registering...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
