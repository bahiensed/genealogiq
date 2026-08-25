'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations, useLocale } from 'next-intl'
import { toast } from 'sonner'
import { Fingerprint } from 'lucide-react'
import { getSaleSchema, saleDefaultValues, type SaleFormValues } from '@/schemas/sale.schema'
import { createSalePaymentLink } from '@/actions/sale.actions'
import { Button } from '@genealogiq/ui/button'
import { Input } from '@genealogiq/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@genealogiq/ui/select'
import { SearchableSelect } from '@genealogiq/ui/searchable-select'
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

interface Coupon {
  id:            string
  code:          string
  discountType:  string
  discountValue: number
  /** Empty means every product. */
  packageIds:    string[]
}

interface SaleFormProps {
  packages?:  Package[]
  customers?: Customer[]
  coupons?:   Coupon[]
}

export function SaleForm({ packages = [], customers = [], coupons = [] }: SaleFormProps) {
  const t    = useTranslations('Sales')
  const tc   = useTranslations('Common')
  const tErr = useTranslations('Errors')
  const locale = useLocale()
  const usd = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' })
  const [serverError, setServerError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingData, setPendingData] = useState<SaleFormValues | null>(null)
  // react-hook-form's isSubmitting resolves the moment onSubmit opens the dialog,
  // so it says nothing about the action that runs on confirm. Two clicks on
  // Confirm used to create two sales; now they would create two CHARGES.
  const [isSending, setIsSending] = useState(false)
  const router = useRouter()

  const form = useForm<SaleFormValues>({
    resolver: useMemo(() => zodResolver(getSaleSchema(tErr)), [tErr]),
    defaultValues: saleDefaultValues,
  })

  const { control, handleSubmit, watch, setValue } = form

  const customerOptions = useMemo(
    () => customers.map((c) => ({ value: c.id, label: c.name })),
    [customers],
  )

  const selectedPackageId = watch('packageId')
  const selectedQty       = watch('quantity') || 0
  const selectedCouponId  = watch('discountCouponId')
  const selectedPkg       = packages.find(p => p.id === selectedPackageId)

  // A coupon with no packageIds applies to everything.
  const availableCoupons = useMemo(
    () => coupons.filter(c => c.packageIds.length === 0 || c.packageIds.includes(selectedPackageId)),
    [coupons, selectedPackageId],
  )

  // Changing the product can strand a coupon that does not apply to the new one.
  useEffect(() => {
    if (selectedCouponId && !availableCoupons.some(c => c.id === selectedCouponId)) {
      setValue('discountCouponId', '')
    }
  }, [availableCoupons, selectedCouponId, setValue])

  const totalQRCodes = selectedPkg && selectedQty > 0 ? selectedQty * selectedPkg.quantity : 0
  const subtotal     = selectedPkg && selectedQty > 0 ? selectedQty * selectedPkg.price : 0
  const unitPrice    = selectedPkg && selectedPkg.quantity > 0 ? selectedPkg.price / selectedPkg.quantity : 0

  // A preview, not the price. Stripe computes what is actually charged, and it
  // is the authority — this only spares the operator a surprise on the invoice.
  const coupon   = availableCoupons.find(c => c.id === selectedCouponId)
  const discount = !coupon ? 0
    : coupon.discountType === 'percent'
      ? subtotal * (coupon.discountValue / 100)
      : Math.min(coupon.discountValue, subtotal)
  const total = subtotal - discount

  function onSubmit(data: SaleFormValues) {
    setPendingData(data)
    setConfirmOpen(true)
  }

  async function handleConfirm() {
    if (!pendingData || isSending) return
    setConfirmOpen(false)
    setServerError(null)
    setIsSending(true)
    try {
      const result = await createSalePaymentLink(pendingData)
      if (!result.ok) {
        setServerError(result.message)
        return
      }
      if (result.message) toast.success(result.message)
      router.push('/sales/manual-sales')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <>
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
                            {p.name} | {t('packageOption.units', { count: p.quantity })} | {usd.format(p.price)}
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
                    <SearchableSelect
                      options={customerOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={t('placeholders.customer')}
                      searchPlaceholder={t('placeholders.customerSearch')}
                      emptyMessage={t('placeholders.customerEmpty')}
                      aria-invalid={fieldState.invalid}
                    />
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

              <Controller
                name="discountCouponId"
                control={control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>{t('fields.coupon')}</FieldLabel>
                    <SearchableSelect
                      options={[
                        { value: '', label: t('placeholders.noCoupon') },
                        ...availableCoupons.map((c) => ({
                          value: c.id,
                          label: c.discountType === 'percent'
                            ? `${c.code} — ${c.discountValue}%`
                            : `${c.code} — ${usd.format(c.discountValue)}`,
                        })),
                      ]}
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                      placeholder={t('placeholders.noCoupon')}
                      searchPlaceholder={t('placeholders.couponSearch')}
                      emptyMessage={t('placeholders.couponEmpty')}
                      disabled={!selectedPackageId}
                    />
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
                      {t('summary.genCodes')}
                    </p>
                    <p className="text-3xl font-extrabold tabular-nums leading-none">
                      {totalQRCodes.toLocaleString(locale)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-1 pt-1 border-t border-primary/10 text-sm">
                  <div className="flex items-baseline justify-between">
                    <span className="text-muted-foreground">{t('summary.subtotal')}</span>
                    <span className="tabular-nums">{usd.format(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex items-baseline justify-between text-emerald-600">
                      <span>{t('summary.discount', { code: coupon!.code })}</span>
                      <span className="tabular-nums">−{usd.format(discount)}</span>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="font-medium">{t('summary.totalPrice')}</span>
                    <span className="text-lg font-bold tabular-nums">{usd.format(total)}</span>
                  </div>
                  <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                    <span>{t('summary.unitPrice')}</span>
                    <span className="tabular-nums">{usd.format(unitPrice)}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{t('summary.stripeAuthority')}</p>
              </div>
            )}

            {serverError && <FieldError>{serverError}</FieldError>}
            <Field orientation="horizontal">
              <Button type="submit" disabled={isSending}>
                {isSending ? t('submitting') : t('submit')}
              </Button>
              <Button type="button" variant="outline" onClick={() => form.reset(saleDefaultValues)}>
                {tc('reset')}
              </Button>
            </Field>
          </form>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirm.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isSending}>{t('confirm.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
