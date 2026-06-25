import { z } from 'zod'
import type { Translator } from './i18n'

function makeDiscountCouponRefine(t: Translator) {
  return (data: { duration: string; durationInMonths?: number | null; discountType: string; discountValue: number }, ctx: z.RefinementCtx) => {
    if (data.duration === 'repeating' && !data.durationInMonths) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['durationInMonths'],
        message: t('durationInMonthsRequired'),
      })
    }
    if (data.discountType === 'percent' && data.discountValue > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['discountValue'],
        message: t('percentMax'),
      })
    }
  }
}

export function getDiscountCouponSchema(t: Translator) {
  return z.object({
    code: z.string()
      .min(3, t('minChars', { count: 3 }))
      .max(32, t('maxChars', { count: 32 }))
      .regex(/^[A-Z0-9_-]+$/, t('couponCodeFormat')),
    description:      z.string().max(255).optional().nullable(),
    discountType:     z.enum(['percent', 'amount']),
    discountValue:    z.number().positive(t('greaterThanZero')),
    duration:         z.enum(['once', 'forever', 'repeating']),
    durationInMonths: z.number().int().positive().optional().nullable(),
    maxRedemptions:   z.number().int().positive().optional().nullable(),
    redeemBy:         z.date().optional().nullable(),
    appliesTo:        z.array(z.string()),
  }).superRefine(makeDiscountCouponRefine(t))
}

export type DiscountCouponFormValues = z.infer<ReturnType<typeof getDiscountCouponSchema>>

export const discountCouponDefaultValues: DiscountCouponFormValues = {
  code:             '',
  description:      '',
  discountType:     'percent',
  discountValue:    10,
  duration:         'once',
  durationInMonths: null,
  maxRedemptions:   null,
  redeemBy:         null,
  appliesTo:        [],
}
