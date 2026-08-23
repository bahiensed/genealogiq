'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { toast } from 'sonner'
import { Printer, ShoppingCart, Undo2, Check, Store } from 'lucide-react'
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
  markGenCodePrinted,
  sellGenCodeManually,
  sellGenCodeViaPlatform,
  undoGenCodeSale,
} from '@/actions/gencode.actions'

export interface GenCodeDetail {
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

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'outline'; cls: string }> = {
  AVAILABLE: { variant: 'secondary', cls: '' },
  SOLD:      { variant: 'outline', cls: 'text-amber-600 border-amber-500/40' },
  ACTIVATED: { variant: 'default', cls: '' },
}

export function GenCodeActions({ license }: { license: GenCodeDetail }) {
  const router = useRouter()
  const t = useTranslations('GenCode')
  const locale = useLocale()
  const [isPending, startTransition] = useTransition()
  const [platformOpen, setPlatformOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [undoOpen, setUndoOpen] = useState(false)

  const usd = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' })
  const fmt = (d: Date | null) =>
    d ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(d)) : null

  const badge = STATUS_BADGE[license.status]
  const printed = license.printedAt != null

  function togglePrinted() {
    startTransition(async () => {
      const res = await markGenCodePrinted(license.genCode, !printed)
      if (!res.ok) toast.error(res.message)
      else { toast.success(printed ? t('toasts.markedNotPrinted') : t('toasts.markedPrinted')); router.refresh() }
    })
  }

  function undo() {
    startTransition(async () => {
      const res = await undoGenCodeSale(license.genCode)
      if (!res.ok) toast.error(res.message)
      else { if (res.message) toast.success(res.message); setUndoOpen(false); router.refresh() }
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          {t('statusCard.title')}
          <Badge variant={badge.variant} className={`ml-auto ${badge.cls}`}>{t(`status.${license.status}`)}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {/* Lifecycle timeline */}
        <ul className="flex flex-col gap-1.5 text-muted-foreground">
          <li>{t('timeline.created')}: <span className="text-foreground">{fmt(license.createdAt)}</span></li>
          <li>
            {t('timeline.printed')}: {printed
              ? <span className="text-emerald-600 inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" />{fmt(license.printedAt)}</span>
              : <span>—</span>}
          </li>
          {license.status !== 'AVAILABLE' && (
            <li>
              {t('timeline.sold')}: <span className="text-foreground">{fmt(license.soldAt)}</span>
              {license.soldVia && <Badge variant="outline" className="ml-1.5 text-[10px]">{t(`soldVia.${license.soldVia}`)}</Badge>}
              {(license.buyer || license.soldToName) && (
                <span className="block text-xs">{t('timeline.soldTo', { name: license.buyer ? `${license.buyer.firstName} ${license.buyer.lastName} (${license.buyer.email})` : (license.soldToName ?? '') })}</span>
              )}
              {license.soldValue != null && <span className="block text-xs">{t('timeline.soldFor', { value: usd.format(license.soldValue) })}</span>}
              {license.soldByName && <span className="block text-xs">{t('timeline.soldBy', { name: license.soldByName })}</span>}
            </li>
          )}
          {license.status === 'ACTIVATED' && license.memorial && (
            <li>{t('timeline.activated')}: <span className="text-foreground">{fmt(license.activatedAt)}</span>
              <span className="block text-xs">{t('timeline.memorial', { name: `${license.memorial.firstName} ${license.memorial.lastName}` })}</span>
            </li>
          )}
        </ul>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1">
          <Button size="sm" variant="outline" disabled={isPending} onClick={togglePrinted} className="w-full justify-start">
            <Printer className="h-4 w-4 mr-2" />
            {printed ? t('actions.markNotPrinted') : t('actions.markPrinted')}
          </Button>

          {license.status === 'AVAILABLE' && (
            <>
              {/* Manual write-off leads: the dominant case is a printed plate
                  sold over the counter, where there is no buyer email to
                  capture at the time the code is used. Sending by email is the
                  secondary path. */}
              <Button size="sm" disabled={isPending} onClick={() => setManualOpen(true)} className="w-full justify-start">
                <ShoppingCart className="h-4 w-4 mr-2" />
                {t('actions.manualWriteOff')}
              </Button>
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => setPlatformOpen(true)} className="w-full justify-start">
                <Store className="h-4 w-4 mr-2" />
                {t('actions.sellViaPlatform')}
              </Button>
            </>
          )}

          {license.status === 'SOLD' && (
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => setUndoOpen(true)} className="w-full justify-start text-destructive">
              <Undo2 className="h-4 w-4 mr-2" />
              {t('actions.undoSale')}
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
        description={t('undo.confirm')}
        onConfirm={undo}
      />
    </Card>
  )
}

// ── Manual sale (off-platform) ────────────────────────────────────────────────

function ManualSaleDialog({ genCode, open, onOpenChange, onDone }: {
  genCode: string; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void
}) {
  const t = useTranslations('GenCode')
  const tc = useTranslations('Common')
  const [buyerName, setBuyerName] = useState('')
  const [value, setValue] = useState('')
  const [isPending, startTransition] = useTransition()

  function submit() {
    const v = value.trim() ? Number(value) : undefined
    startTransition(async () => {
      const res = await sellGenCodeManually(genCode, { buyerName, value: v })
      if (!res.ok) toast.error(res.message)
      else { if (res.message) toast.success(res.message); onOpenChange(false); setBuyerName(''); setValue(''); onDone() }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('manualSale.title')}</DialogTitle>
          <DialogDescription>
            {t('manualSale.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="buyer">{t('fields.buyerName')}</Label>
            <Input id="buyer" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder={t('placeholders.buyerName')} autoComplete="off" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="value">{t('fields.saleValue')}</Label>
            <Input id="value" type="number" min="0" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0.00" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>{tc('cancel')}</Button>
          <Button onClick={submit} disabled={isPending || !buyerName.trim()}>
            {isPending ? tc('saving') : t('manualSale.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Send by email (creates the buyer if needed + emails access) ───────────────

function PlatformSaleDialog({ genCode, open, onOpenChange, onDone }: {
  genCode: string; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void
}) {
  const t = useTranslations('GenCode')
  const tc = useTranslations('Common')
  // No customer lookup here on purpose: the buyer does not have to exist yet.
  // Name + email is everything the action needs to create them and mail the code.
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [value, setValue] = useState('')
  const [isPending, startTransition] = useTransition()

  const canSubmit = firstName.trim() && lastName.trim() && email.trim()

  function submit() {
    if (!canSubmit) return
    const v = value.trim() ? Number(value) : undefined
    startTransition(async () => {
      const res = await sellGenCodeViaPlatform(genCode, {
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        email:     email.trim(),
        value:     v,
      })
      if (!res.ok) toast.error(res.message)
      else {
        if (res.message) toast.success(res.message)
        onOpenChange(false)
        setFirstName(''); setLastName(''); setEmail(''); setValue('')
        onDone()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('platformSale.title')}</DialogTitle>
          <DialogDescription>
            {t('platformSale.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pfirst">{t('fields.buyerFirstName')}</Label>
              <Input id="pfirst" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="off" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plast">{t('fields.buyerLastName')}</Label>
              <Input id="plast" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="off" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pemail">{t('fields.buyerEmail')}</Label>
            <Input id="pemail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@exemplo.com" autoComplete="off" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pvalue">{t('fields.saleValue')}</Label>
            <Input id="pvalue" type="number" min="0" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0.00" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>{tc('cancel')}</Button>
          <Button onClick={submit} disabled={isPending || !canSubmit}>
            {isPending ? t('platformSale.submitting') : t('platformSale.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
