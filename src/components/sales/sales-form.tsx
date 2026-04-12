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

interface AvailableLicense {
  quantity: number
  license: {
    id:          string
    component:   string
    description: string | null
  }
}

interface SalesFormProps {
  licenses: AvailableLicense[]
}

interface FieldErrors {
  appUser?:  string
  licenseId?: string
  value?:    string
}

export function SalesForm({ licenses }: SalesFormProps) {
  const [query,       setQuery]       = useState('')
  const [results,     setResults]     = useState<AppUserResult[]>([])
  const [open,        setOpen]        = useState(false)
  const [selected,    setSelected]    = useState<AppUserResult | null>(null)
  const [licenseId,   setLicenseId]   = useState('')
  const [value,       setValue]       = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isPending,   startTransition] = useTransition()

  const dropdownRef = useRef<HTMLDivElement>(null)
  const formRef     = useRef<HTMLFormElement>(null)

  // Busca dinâmica: dispara após 2º caractere + 300ms debounce
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

  // Fecha dropdown ao clicar fora
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
    if (!selected)  errors.appUser   = 'Selecione um cliente.'
    if (!licenseId) errors.licenseId = 'Selecione uma licença.'

    const numValue = parseFloat(value.replace(',', '.'))
    if (!value || isNaN(numValue) || numValue < 0) {
      errors.value = 'Informe um valor válido.'
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
      const result = await createAppSale(selected!.id, licenseId, numValue)
      if ('error' in result) {
        setServerError(result.error)
      } else {
        toast.success(result.success)
        setSelected(null)
        setLicenseId('')
        setValue('')
      }
    })
  }

  return (
    <>
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-xl">
      <FieldGroup>
        {/* Busca de cliente */}
        <Field data-invalid={!!fieldErrors.appUser || undefined}>
          <FieldLabel>Cliente</FieldLabel>
          {selected ? (
            <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <span className="flex-1">
                {selected.firstName} {selected.lastName}
                <span className="ml-2 text-muted-foreground">{selected.email}</span>
              </span>
              <button type="button" onClick={clearSelected} aria-label="Remover cliente">
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Digite o nome ou e-mail..."
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

        {/* Licença */}
        <Field data-invalid={!!fieldErrors.licenseId || undefined}>
          <FieldLabel>Licença</FieldLabel>
          <Select value={licenseId} onValueChange={(v) => { setLicenseId(v); setFieldErrors((prev) => ({ ...prev, licenseId: undefined })) }}>
            <SelectTrigger aria-invalid={!!fieldErrors.licenseId}>
              <SelectValue placeholder="Selecione uma licença..." />
            </SelectTrigger>
            <SelectContent>
              {licenses.map(({ license, quantity }) => (
                <SelectItem key={license.id} value={license.id}>
                  {license.component}
                  <span className="ml-2 text-muted-foreground">({quantity} disponível)</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.licenseId && <FieldError>{fieldErrors.licenseId}</FieldError>}
        </Field>

        {/* Valor */}
        <Field data-invalid={!!fieldErrors.value || undefined}>
          <FieldLabel>Valor (US$)</FieldLabel>
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
          {isPending ? 'Registrando...' : 'Finalizar Venda'}
        </Button>
      </div>
    </form>

    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar venda</DialogTitle>
          <DialogDescription>
            A venda será registrada e uma licença será retirada do estoque. Deseja confirmar?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? 'Registrando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
