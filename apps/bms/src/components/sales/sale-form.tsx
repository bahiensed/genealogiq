'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations, useLocale } from 'next-intl'
import { toast } from 'sonner'
import { Fingerprint } from 'lucide-react'
import { getSaleSchema, saleDefaultValues, type SaleFormValues } from '@/schemas/sale.schema'
import { createSale } from '@/actions/sale.actions'
import { Button } from '@genealogiq/ui/button'
import { Input } from '@genealogiq/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@genealogiq/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@genealogiq/ui/card'
import { Separator } from '@genealogiq/ui/separator'
import { Field, FieldError, FieldGroup, FieldLabel } from '@genealogiq/ui/field'

interface Package {
  id:       string
  name:     string
  price:    number
  quantity: number
}

interface Customer {
  id:   string
  name: string
}

interface SaleFormProps {
  packages?:  Package[]
  customers?: Customer[]
}

export function SaleForm({ packages = [], customers = [] }: SaleFormProps) {
  const t    = useTranslations('Sales')
  const tc   = useTranslations('Common')
  const tErr = useTranslations('Errors')
  const locale = useLocale()
  const usd = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' })
  const [serverError, setServerError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingData, setPendingData] = useState<SaleFormValues | null>(null)
  const router = useRouter()

  const form = useForm<SaleFormValues>({
    resolver: useMemo(() => zodResolver(getSaleSchema(tErr)), [tErr]),
    defaultValues: saleDefaultValues,
  })

  const { control, handleSubmit, watch, formState: { isSubmitting } } = form

  const selectedPackageId = watch('packageId')
  const selectedQty       = watch('quantity') || 0
  const selectedPkg       = packages.find(p => p.id === selectedPackageId)

  const totalQRCodes   = selectedPkg && selectedQty > 0 ? selectedQty * selectedPkg.quantity : 0
  const totalPrice     = selectedPkg && selectedQty > 0 ? selectedQty * selectedPkg.price : 0
  const unitPrice      = selectedPkg && selectedPkg.quantity > 0 ? selectedPkg.price / selectedPkg.quantity : 0

  function onSubmit(data: SaleFormValues) {
    setPendingData(data)
    setConfirmOpen(true)
  }

  async function handleConfirm() {
    if (!pendingData) return
    setConfirmOpen(false)
    setServerError(null)
    const result = await createSale(pendingData)
    if (!result.ok) {
      setServerError(result.message)
    } else {
      if (result.message) toast.success(result.message)
      router.push('/sales/manual-sales')
    }
  }

  return (
    <>
      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle className="scroll-m-20 text-2xl font-bold tracking-tight">
              {t('new')}
            </CardTitle>
          </CardHeader>
          <Separator />
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">

              <FieldGroup>
                <Controller
                  name="packageId"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>{t('fields.package')}</FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger aria-invalid={fieldState.invalid}>
                          <SelectValue placeholder={t('placeholders.package')} />
                        </SelectTrigger>
                        <SelectContent>
                          {packages.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} · {t('packageOption.codes', { count: p.quantity })} · {usd.format(p.price)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="tenantId"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>{t('fields.customer')}</FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger aria-invalid={fieldState.invalid}>
                          <SelectValue placeholder={t('placeholders.customer')} />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="quantity"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>{t('fields.quantity')}</FieldLabel>
                      <Input
                        type="number"
                        step="1"
                        min="1"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(isNaN(e.target.valueAsNumber) ? '' : e.target.valueAsNumber)}
                        autoComplete="off"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </FieldGroup>

              {/* Summary card */}
              {totalQRCodes > 0 && (
                <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Fingerprint className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                        {t('summary.physicalCodes')}
                      </p>
                      <p className="text-3xl font-extrabold tabular-nums leading-none">
                        {totalQRCodes.toLocaleString(locale)}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-primary/10">
                    <div>
                      <p className="text-xs text-muted-foreground">{t('summary.totalPrice')}</p>
                      <p className="text-lg font-bold tabular-nums">{usd.format(totalPrice)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{t('summary.unitPrice')}</p>
                      <p className="text-lg font-bold tabular-nums">{usd.format(unitPrice)}</p>
                    </div>
                  </div>
                </div>
              )}

              {serverError && <FieldError>{serverError}</FieldError>}
              <Field orientation="horizontal">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t('submitting') : t('submit')}
                </Button>
                <Button type="button" variant="outline" onClick={() => form.reset(saleDefaultValues)}>
                  {tc('reset')}
                </Button>
              </Field>
            </form>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirm.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>{t('confirm.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
