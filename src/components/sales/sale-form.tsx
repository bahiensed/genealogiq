'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { saleResolver, saleDefaultValues, type SaleFormValues } from '@/schemas/sale.schema'
import { createSale } from '@/actions/sale.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'

interface Package {
  id: string
  name: string
  price: number
  quantity: number
}

interface Customer {
  id: string
  name: string
}

interface SaleFormProps {
  packages?: Package[]
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
      router.push('/manual-sales')
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 max-w-lg">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          New sale
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
                        {p.name} — {usd.format(p.price)}
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
                <FieldLabel>Quantity:</FieldLabel>
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
                {selectedPkg && selectedQty > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {selectedQty * selectedPkg.quantity} licenses · {usd.format(selectedQty * selectedPkg.price)}
                  </p>
                )}
              </Field>
            )}
          />
        </FieldGroup>

        {serverError && <FieldError>{serverError}</FieldError>}
        <Field orientation="horizontal">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Recording…' : 'Sale'}
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
