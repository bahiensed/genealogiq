'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateDiscountCoupon } from '@/actions/discount-coupon.actions'
import { Button } from '@genealogiq/ui/button'
import { Input } from '@genealogiq/ui/input'
import { Textarea } from '@genealogiq/ui/textarea'
import { Field, FieldError, FieldGroup, FieldLabel } from '@genealogiq/ui/field'

interface DiscountCouponEditFormProps {
  id:           string
  code:         string
  description:  string | null
}

export function DiscountCouponEditForm({ id, code, description }: DiscountCouponEditFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [value, setValue] = useState(description ?? '')
  const [serverError, setServerError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)
    startTransition(async () => {
      const result = await updateDiscountCoupon(id, { description: value.trim() || null })
      if ('error' in result) { setServerError(result.error); return }
      toast.success(result.success)
      router.push('/sales/discount-coupons')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">
      {serverError && <FieldError>{serverError}</FieldError>}

      <FieldGroup>
        <Field>
          <FieldLabel>Code:</FieldLabel>
          <Input value={code} disabled readOnly className="font-mono" />
          <p className="text-xs text-muted-foreground">
            The promotion code is immutable. To change terms, deactivate this coupon and create a new one.
          </p>
        </Field>

        <Field>
          <FieldLabel>Description:</FieldLabel>
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={3}
            placeholder="Internal note (not shown to customers)"
            maxLength={255}
          />
        </Field>
      </FieldGroup>

      <Field orientation="horizontal">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save changes'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/sales/discount-coupons')}>
          Cancel
        </Button>
      </Field>
    </form>
  )
}
