'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { Fingerprint, QrCode } from 'lucide-react'
import { saleResolver, saleDefaultValues, type SaleFormValues } from '@/schemas/sale.schema'
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
import { Field, FieldError, FieldGroup, FieldLabel } from '@genealogiq/ui/field'

interface Package {
  id:       string
  name:     string
  price:    number
  quantity: number
  type:     'DIGITAL' | 'PHYSICAL'
}

interface Customer {
  id:   string
  name: string
}

interface SaleFormProps {
  packages?:  Package[]
  customers?: Customer[]
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function SaleForm({ packages = [], customers = [] }: SaleFormProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingData, setPendingData] = useState<SaleFormValues | null>(null)
  const router = useRouter()

  const form = useForm<SaleFormValues>({
    resolver: saleResolver,
    defaultValues: saleDefaultValues,
  })

  const { control, handleSubmit, watch, formState: { isSubmitting } } = form

  const selectedPackageId = watch('packageId')
  const selectedQty       = watch('quantity') || 0
  const selectedPkg       = packages.find(p => p.id === selectedPackageId)

  const isPhysical     = selectedPkg?.type === 'PHYSICAL'
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
    if ('error' in result) {
      setServerError(result.error)
    } else {
      toast.success(result.success)
      router.push('/sales/manual-sales')
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8 max-w-lg">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          New QR Code Package Sale
        </h1>

        <FieldGroup>
          <Controller
            name="packageId"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Package:</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Select a package" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} · {p.type === 'DIGITAL' ? 'Digital' : 'Physical'} · {p.quantity.toLocaleString('en-US')} codes · {usd.format(p.price)}
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
                <FieldLabel>Customer:</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Select a customer" />
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
                <FieldLabel>Package Quantity:</FieldLabel>
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

        {/* Summary card — adapts by package type */}
        {totalQRCodes > 0 && (
          <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                {isPhysical
                  ? <Fingerprint className="h-5 w-5 text-primary" />
                  : <QrCode      className="h-5 w-5 text-primary" />}
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  {isPhysical ? 'Physical license codes to be generated' : 'QR Codes to be added to inventory'}
                </p>
                <p className="text-3xl font-extrabold tabular-nums leading-none">
                  {totalQRCodes.toLocaleString('en-US')}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-primary/10">
              <div>
                <p className="text-xs text-muted-foreground">Total price</p>
                <p className="text-lg font-bold tabular-nums">{usd.format(totalPrice)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Unit price / code</p>
                <p className="text-lg font-bold tabular-nums">{usd.format(unitPrice)}</p>
              </div>
            </div>
          </div>
        )}

        {serverError && <FieldError>{serverError}</FieldError>}
        <Field orientation="horizontal">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting…' : 'Submit Sale'}
          </Button>
          <Button type="button" variant="outline" onClick={() => form.reset(saleDefaultValues)}>
            Reset
          </Button>
        </Field>
      </form>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm sale</AlertDialogTitle>
            <AlertDialogDescription>
              Before completing this sale, please verify that payment has already been received.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
