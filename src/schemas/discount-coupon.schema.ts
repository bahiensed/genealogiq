import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

export const discountCouponSchema = z.object({
  code: z.string()
    .min(3, 'Must be at least 3 characters')
    .max(32, 'Must be at most 32 characters')
    .regex(/^[A-Z0-9_-]+$/, 'Only uppercase letters, numbers, hyphens and underscores'),
  description:      z.string().max(255).optional().nullable(),
  discountType:     z.enum(['percent', 'amount']),
  discountValue:    z.number().positive('Must be greater than 0'),
  duration:         z.enum(['once', 'forever', 'repeating']),
  durationInMonths: z.number().int().positive().optional().nullable(),
  maxRedemptions:   z.number().int().positive().optional().nullable(),
  redeemBy:         z.date().optional().nullable(),
  appliesTo:        z.array(z.string()),
}).superRefine((data, ctx) => {
  if (data.duration === 'repeating' && !data.durationInMonths) {
    ctx.addIssue({
      code: 'custom',
      path: ['durationInMonths'],
      message: 'Required when duration is "repeating"',
    })
  }
  if (data.discountType === 'percent' && data.discountValue > 100) {
    ctx.addIssue({
      code: 'custom',
      path: ['discountValue'],
      message: 'Percent must be 100 or less',
    })
  }
})

export type DiscountCouponFormValues = z.infer<typeof discountCouponSchema>

export const discountCouponResolver = zodResolver(discountCouponSchema)

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
