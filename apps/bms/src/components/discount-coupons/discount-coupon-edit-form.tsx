'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
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
  const t  = useTranslations('DiscountCoupons')
  const tc = useTranslations('Common')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [value, setValue] = useState(description ?? '')
  const [serverError, setServerError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)
    startTransition(async () => {
      const result = await updateDiscountCoupon(id, { description: value.trim() || null })
      if (!result.ok) { setServerError(result.message); return }
      if (result.message) toast.success(result.message)
      router.push('/sales/discount-coupons')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {serverError && <FieldError>{serverError}</FieldError>}

      <FieldGroup>
        <Field>
          <FieldLabel>{t('fields.code')}</FieldLabel>
          <Input value={code} disabled readOnly className="font-mono" />
          <p className="text-xs text-muted-foreground">
            {t('hints.codeImmutable')}
          </p>
        </Field>

        <Field>
          <FieldLabel>{t('fields.description')}</FieldLabel>
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={3}
            placeholder={t('placeholders.descriptionEdit')}
            maxLength={255}
          />
        </Field>
      </FieldGroup>

      <Field orientation="horizontal">
        <Button type="submit" disabled={isPending}>
          {isPending ? tc('saving') : t('saveChanges')}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/sales/discount-coupons')}>
          {tc('cancel')}
        </Button>
      </Field>
    </form>
  )
}
