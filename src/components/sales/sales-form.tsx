'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Search, X } from 'lucide-react'
import { createAppSale } from '@/actions/sale.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
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
  qrCodeCount:   number
  subscriptions: Subscription[]
}

interface FieldErrors {
  appUser?:        string
  subscriptionId?: string
  value?:          string
}

export function SalesForm({ qrCodeCount, subscriptions }: SalesFormProps) {
  const [query,          setQuery]          = useState('')
  const [results,        setResults]        = useState<AppUserResult[]>([])
  const [open,           setOpen]           = useState(false)
  const [selected,       setSelected]       = useState<AppUserResult | null>(null)
  const [subscriptionId, setSubscriptionId] = useState('')
  const [value,          setValue]          = useState('')
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

    const numValue = parseFloat(value.replace(',', '.'))
    if (!value || isNaN(numValue) || numValue < 0) {
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
    const numValue = parseFloat(value.replace(',', '.'))
    startTransition(async () => {
      const result = await createAppSale(selected!.id, subscriptionId, numValue)
      if ('error' in result) {
        setServerError(result.error)
      } else {
        toast.success(result.success)
        setSelected(null)
        setSubscriptionId('')
        setValue('')
      }
    })
  }

  return (
    <>
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-xl">
      <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm self-start">
        <span className="font-medium tabular-nums">{qrCodeCount}</span>
        <span className="ml-1.5 text-muted-foreground">
          {qrCodeCount === 1 ? 'QR code available' : 'QR codes available'}
        </span>
      </div>

      <FieldGroup>
        {/* Customer search */}
        <Field data-invalid={!!fieldErrors.appUser || undefined}>
          <FieldLabel>Customer</FieldLabel>
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
          {fieldErrors.appUser && <FieldError>{fieldErrors.appUser}</FieldError>}
        </Field>

        {/* Subscription */}
        <Field data-invalid={!!fieldErrors.subscriptionId || undefined}>
          <FieldLabel>Subscription</FieldLabel>
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
          {fieldErrors.subscriptionId && <FieldError>{fieldErrors.subscriptionId}</FieldError>}
        </Field>

        {/* Amount */}
        <Field data-invalid={!!fieldErrors.value || undefined}>
          <FieldLabel>Amount (US$)</FieldLabel>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="0,00"
            value={value}
            onChange={(e) => { setValue(e.target.value); setFieldErrors((prev) => ({ ...prev, value: undefined })) }}
            aria-invalid={!!fieldErrors.value}
          />
          {fieldErrors.value && <FieldError>{fieldErrors.value}</FieldError>}
        </Field>
      </FieldGroup>

      {serverError && <FieldError>{serverError}</FieldError>}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Registering...' : 'Complete sale'}
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
