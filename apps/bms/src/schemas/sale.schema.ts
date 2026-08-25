import { z } from 'zod'
import type { Translator } from './i18n'

/**
 * An order of 10 000 units already mints 10 000 GenCode rows in one createMany.
 * The cap is not a business rule — it is a typo guard, because until now nothing
 * stopped a stray keystroke from turning 5 into 50000 and charging for it.
 */
export const MAX_SALE_QUANTITY = 1_000

export function getSaleSchema(t: Translator) {
  return z.object({
    packageId:        z.string().min(1, t('required')),
    tenantId:         z.string().min(1, t('required')),
    quantity:         z.number()
      .int(t('mustBeWholeNumber'))
      .positive(t('mustBePositive'))
      .max(MAX_SALE_QUANTITY, t('maxQuantity', { count: MAX_SALE_QUANTITY })),
    // Empty string is "no coupon" — a Select cannot hold undefined.
    discountCouponId: z.string().optional(),
    /// How the tenant pays for the term: once up front, or in instalments.
    cadence:          z.enum(['annual', 'monthly']),
  })
}

export type SaleFormValues = z.infer<ReturnType<typeof getSaleSchema>>

export const saleDefaultValues: SaleFormValues = {
  packageId:        '',
  tenantId:         '',
  quantity:         1,
  discountCouponId: '',
  cadence:          'annual',
}
