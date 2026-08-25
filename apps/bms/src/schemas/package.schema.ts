import { z } from 'zod'
import type { Translator } from './i18n'

/**
 * Prices are per currency and every one is optional: a product is sellable in
 * the currencies it is priced in and invisible in the rest. Zero means "not
 * priced" — the same convention ExtraUnitPrice uses — because a currency input
 * cannot hold null.
 *
 * The refinement is the one rule that matters: a product with no price at all
 * is not a product, it is a draft nobody can buy.
 */
export function getPackageSchema(t: Translator) {
  return z.object({
    name:        z.string()
      .min(4, t('minChars', { count: 4 }))
      .max(32, t('maxChars', { count: 32 })),
    quantity:    z.number().int(t('wholeNumber')).positive(t('greaterThanZero')),
    description: z.string()
      .min(12, t('minChars', { count: 12 }))
      .max(256, t('maxChars', { count: 256 })),
    priceUsd:    z.number().min(0, t('mustBeZeroOrGreater')),
    priceBrl:    z.number().min(0, t('mustBeZeroOrGreater')),
    priceMxn:    z.number().min(0, t('mustBeZeroOrGreater')),
    isActive:    z.boolean(),
  }).refine(
    (v) => v.priceUsd > 0 || v.priceBrl > 0 || v.priceMxn > 0,
    { message: t('atLeastOnePrice'), path: ['priceUsd'] },
  )
}

export type PackageFormValues = z.infer<ReturnType<typeof getPackageSchema>>

export const packageDefaultValues: PackageFormValues = {
  name:        '',
  quantity:    1,
  description: '',
  priceUsd:    0,
  priceBrl:    0,
  priceMxn:    0,
  isActive:    true,
}
