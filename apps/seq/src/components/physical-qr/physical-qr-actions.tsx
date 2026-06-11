'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Printer, ShoppingCart, Search, X, Undo2, Check, Store } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@genealogiq/ui/card'
import { Button } from '@genealogiq/ui/button'
import { Badge } from '@genealogiq/ui/badge'
import { Input } from '@genealogiq/ui/input'
import { Label } from '@genealogiq/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@genealogiq/ui/dialog'
import { ConfirmDeleteDialog } from '@genealogiq/ui/confirm-delete-dialog'
import {
  markPhysicalQrPrinted,
  sellPhysicalQrManually,
  sellPhysicalQrViaPlatform,
  undoPhysicalQrSale,
} from '@/actions/physical-qr.actions'

export interface PhysicalQrDetail {
  genCode:    string
  status:     'AVAILABLE' | 'SOLD' | 'ACTIVATED'
  printedAt:  Date | null
  soldAt:     Date | null
  soldVia:    'PLATFORM' | 'MANUAL' | null
  soldToName: string | null
  soldValue:  number | null
  activatedAt: Date | null
  createdAt:  Date
  memorial:   { firstName: string; lastName: string } | null
  buyer:      { firstName: string; lastName: string; email: string } | null
  soldByName: string | null
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const fmt = (d: Date | null) =>
  d ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(d)) : null

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'outline'; cls: string }> = {
  AVAILABLE: { variant: 'secondary', cls: '' },
  SOLD:      { variant: 'outline', cls: 'text-amber-600 border-amber-500/40' },
  ACTIVATED: { variant: 'default', cls: '' },
}

export function PhysicalQrActions({ license }: { license: PhysicalQrDetail }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [platformOpen, setPlatformOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [undoOpen, setUndoOpen] = useState(false)

  const badge = STATUS_BADGE[license.status]
  const printed = license.printedAt != null

  function togglePrinted() {
    startTransition(async () => {
      const res = await markPhysicalQrPrinted(license.genCode, !printed)
      if (res?.error) toast.error(res.error)
      else { toast.success(printed ? 'Marked as not printed.' : 'Marked as printed.'); router.refresh() }
    })
  }

  function undo() {
    startTransition(async () => {
      const res = await undoPhysicalQrSale(license.genCode)
      if ('error' in res) toast.error(res.error)
      else { toast.success(res.success); setUndoOpen(false); router.refresh() }
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          QR Code Status
          <Badge variant={badge.variant} className={`ml-auto ${badge.cls}`}>{license.status}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {/* Lifecycle timeline */}
        <ul className="flex flex-col gap-1.5 text-muted-foreground">
          <li>Created: <span className="text-foreground">{fmt(license.createdAt)}</span></li>
          <li>
            Printed: {printed
              ? <span className="text-emerald-600 inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" />{fmt(license.printedAt)}</span>
              : <span>—</span>}
          </li>
          {license.status !== 'AVAILABLE' && (
            <li>
              Sold: <span className="text-foreground">{fmt(license.soldAt)}</span>
              {license.soldVia && <Badge variant="outline" className="ml-1.5 text-[10px]">{license.soldVia}</Badge>}
              {(license.buyer || license.soldToName) && (
                <span className="block text-xs">to {license.buyer ? `${license.buyer.firstName} ${license.buyer.lastName} (${license.buyer.email})` : license.soldToName}</span>
              )}
              {license.soldValue != null && <span className="block text-xs">for {usd.format(license.soldValue)}</span>}
              {license.soldByName && <span className="block text-xs">by {license.soldByName}</span>}
            </li>
          )}
          {license.status === 'ACTIVATED' && license.memorial && (
            <li>Activated: <span className="text-foreground">{fmt(license.activatedAt)}</span>
              <span className="block text-xs">memorial: {license.memorial.firstName} {license.memorial.lastName}</span>
            </li>
          )}
        </ul>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1">
          <Button size="sm" variant="outline" disabled={isPending} onClick={togglePrinted} className="w-full justify-start">
            <Printer className="h-4 w-4 mr-2" />
            {printed ? 'Mark as not printed' : 'Mark as printed'}
          </Button>

          {license.status === 'AVAILABLE' && (
            <>
              <Button size="sm" disabled={isPending} onClick={() => setPlatformOpen(true)} className="w-full justify-start">
                <Store className="h-4 w-4 mr-2" />
                Sell via platform
              </Button>
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => setManualOpen(true)} className="w-full justify-start">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Manual write-off (off-platform)
              </Button>
            </>
          )}

          {license.status === 'SOLD' && (
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => setUndoOpen(true)} className="w-full justify-start text-destructive">
              <Undo2 className="h-4 w-4 mr-2" />
              Undo sale (back to available)
            </Button>
          )}
        </div>
      </CardContent>

      <PlatformSaleDialog
        genCode={license.genCode}
        open={platformOpen}
        onOpenChange={setPlatformOpen}
        onDone={() => router.refresh()}
      />
      <ManualSaleDialog
        genCode={license.genCode}
        open={manualOpen}
        onOpenChange={setManualOpen}
        onDone={() => router.refresh()}
      />
      <ConfirmDeleteDialog
        open={undoOpen}
        onOpenChange={setUndoOpen}
        isPending={isPending}
        description="This will mark the code as available again. Only possible while it has not been activated by the consumer."
        onConfirm={undo}
      />
    </Card>
  )
}

// ── Manual sale (off-platform) ────────────────────────────────────────────────

function ManualSaleDialog({ genCode, open, onOpenChange, onDone }: {
  genCode: string; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void
}) {
  const [buyerName, setBuyerName] = useState('')
  const [value, setValue] = useState('')
  const [isPending, startTransition] = useTransition()

  function submit() {
    const v = value.trim() ? Number(value) : undefined
    startTransition(async () => {
      const res = await sellPhysicalQrManually(genCode, { buyerName, value: v })
      if ('error' in res) toast.error(res.error)
      else { toast.success(res.success); onOpenChange(false); setBuyerName(''); setValue(''); onDone() }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manual write-off</DialogTitle>
          <DialogDescription>
            Record a sale made outside the platform so this code can&apos;t be sold again.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="buyer">Buyer name / contact</Label>
            <Input id="buyer" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Who bought it?" autoComplete="off" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="value">Sale value (optional)</Label>
            <Input id="value" type="number" min="0" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0.00" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
          <Button onClick={submit} disabled={isPending || !buyerName.trim()}>
            {isPending ? 'Saving…' : 'Write off'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Platform sale (assign to a consumer + email access) ───────────────────────

interface AppUserResult { id: string; firstName: string; lastName: string; email: string }

function PlatformSaleDialog({ genCode, open, onOpenChange, onDone }: {
  genCode: string; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AppUserResult[]>([])
  const [listOpen, setListOpen] = useState(false)
  const [selected, setSelected] = useState<AppUserResult | null>(null)
  const [value, setValue] = useState('')
  const [isPending, startTransition] = useTransition()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!query.trim()) { setResults([]); setListOpen(false); return }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/app-users?q=${encodeURIComponent(query)}`)
      const data: AppUserResult[] = await res.json()
      setResults(data)
      setListOpen(data.length > 0)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  function submit() {
    if (!selected) return
    const v = value.trim() ? Number(value) : undefined
    startTransition(async () => {
      const res = await sellPhysicalQrViaPlatform(genCode, selected.id, v)
      if ('error' in res) toast.error(res.error)
      else { toast.success(res.success); onOpenChange(false); setSelected(null); setQuery(''); setValue(''); onDone() }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sell via platform</DialogTitle>
          <DialogDescription>
            Assign this code to a registered customer and email them access to the app. The code is written off.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Customer</Label>
            {selected ? (
              <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <span className="flex-1">{selected.firstName} {selected.lastName}<span className="ml-2 text-muted-foreground">{selected.email}</span></span>
                <button type="button" onClick={() => setSelected(null)} aria-label="Remove customer">
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Type name or email…" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
                {listOpen && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
                    {results.map((u) => (
                      <button key={u.id} type="button" className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-accent"
                        onMouseDown={() => { setSelected(u); setQuery(''); setResults([]); setListOpen(false) }}>
                        <span className="font-medium">{u.firstName} {u.lastName}</span>
                        <span className="text-muted-foreground">{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pvalue">Sale value (optional)</Label>
            <Input id="pvalue" type="number" min="0" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0.00" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
          <Button onClick={submit} disabled={isPending || !selected}>
            {isPending ? 'Selling…' : 'Sell & send access'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
