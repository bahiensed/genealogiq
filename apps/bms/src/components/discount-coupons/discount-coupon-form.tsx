'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import {
  discountCouponResolver,
  discountCouponDefaultValues,
  type DiscountCouponFormValues,
} from '@/schemas/discount-coupon.schema'
import { createDiscountCoupon } from '@/actions/discount-coupon.actions'
import { Button } from '@genealogiq/ui/button'
import { Input } from '@genealogiq/ui/input'
import { Textarea } from '@genealogiq/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@genealogiq/ui/select'
import { Checkbox } from '@genealogiq/ui/checkbox'
import { Field, FieldError, FieldGroup, FieldLabel } from '@genealogiq/ui/field'

interface PackageOption {
  id:       string
  name:     string
  price:    number
  quantity: number
}

interface DiscountCouponFormProps {
  packages: PackageOption[]
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function DiscountCouponForm({ packages }: DiscountCouponFormProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm<DiscountCouponFormValues>({
    resolver:      discountCouponResolver,
    defaultValues: discountCouponDefaultValues,
  })

  const { control, handleSubmit, watch, formState: { isSubmitting } } = form
  const duration     = watch('duration')
  const discountType = watch('discountType')

  async function onSubmit(data: DiscountCouponFormValues) {
    setServerError(null)
    const result = await createDiscountCoupon(data)
    if ('error' in result) {
      setServerError(result.error)
    } else {
      toast.success(result.success)
      router.push('/sales/discount-coupons')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 max-w-2xl">
      {serverError && <FieldError>{serverError}</FieldError>}

      <FieldGroup>
        <Controller
          name="code"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Code:</FieldLabel>
              <Input
                {...field}
                autoComplete="off"
                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                placeholder="WELCOME10"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="description"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Description:</FieldLabel>
              <Textarea
                {...field}
                value={field.value ?? ''}
                rows={2}
                placeholder="Optional internal note"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            name="discountType"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel>Discount type:</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percent off</SelectItem>
                    <SelectItem value="amount">Fixed amount off (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          />

          <Controller
            name="discountValue"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>{discountType === 'percent' ? 'Percent (0-100):' : 'Amount ($):'}</FieldLabel>
                <Input
                  type="number"
                  step={discountType === 'percent' ? '1' : '0.01'}
                  min="0"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            name="duration"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel>Duration:</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">Once (first invoice only)</SelectItem>
                    <SelectItem value="forever">Forever (every invoice)</SelectItem>
                    <SelectItem value="repeating">Repeating (N months)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          />

          {duration === 'repeating' && (
            <Controller
              name="durationInMonths"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Duration in months:</FieldLabel>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            name="maxRedemptions"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Max redemptions:</FieldLabel>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Blank = unlimited"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="redeemBy"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Expires on:</FieldLabel>
                <Input
                  type="date"
                  value={field.value ? new Date(field.value).toISOString().slice(0, 10) : ''}
                  onChange={(e) => field.onChange(e.target.value === '' ? null : new Date(e.target.value))}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        {packages.length > 0 && (
          <Controller
            name="appliesTo"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel>Applies to specific packages (optional):</FieldLabel>
                <p className="text-xs text-muted-foreground">Leave all unchecked to apply to every package.</p>
                <div className="flex flex-col gap-2 mt-1">
                  {packages.map((p) => {
                    const checked = field.value.includes(p.id)
                    return (
                      <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(c) => {
                            const next = c
                              ? [...field.value, p.id]
                              : field.value.filter((id) => id !== p.id)
                            field.onChange(next)
                          }}
                        />
                        <span>
                          {p.name}
                          <span className="text-muted-foreground"> — {p.quantity} QR codes · {usd.format(p.price)}</span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </Field>
            )}
          />
        )}
      </FieldGroup>

      <Field orientation="horizontal">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Create coupon'}
        </Button>
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          Reset
        </Button>
      </Field>
    </form>
  )
}
