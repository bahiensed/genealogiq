import { z } from 'zod'
import type { Translator } from './i18n'

/**
 * Prices are per currency AND per cadence, and every one is optional: a product
 * is sellable in the currencies it is priced in and invisible in the rest. Zero
 * means "not priced" — the same convention ExtraUnitPrice uses — because a
 * currency input cannot hold null.
 *
 * The annual price is what makes a currency available at all; the monthly one is
 * an alternative way to pay for the same term, and is optional on its own. A
 * currency priced monthly but not annually would be a product with an instalment
 * plan and no price, so the refinement rejects it.
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
    termLength:      z.number().int(t('wholeNumber')).positive(t('greaterThanZero')),
    priceUsd:        z.number().min(0, t('mustBeZeroOrGreater')),
    monthlyPriceUsd: z.number().min(0, t('mustBeZeroOrGreater')),
    priceBrl:        z.number().min(0, t('mustBeZeroOrGreater')),
    monthlyPriceBrl: z.number().min(0, t('mustBeZeroOrGreater')),
    priceMxn:        z.number().min(0, t('mustBeZeroOrGreater')),
    monthlyPriceMxn: z.number().min(0, t('mustBeZeroOrGreater')),
    isActive:    z.boolean(),
  }).superRefine((v, ctx) => {
    if (v.priceUsd <= 0 && v.priceBrl <= 0 && v.priceMxn <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['priceUsd'], message: t('atLeastOnePrice') })
    }
    // An instalment plan for a currency that has no price is not a product.
    for (const [annual, monthly, path] of [
      [v.priceUsd, v.monthlyPriceUsd, 'monthlyPriceUsd'],
      [v.priceBrl, v.monthlyPriceBrl, 'monthlyPriceBrl'],
      [v.priceMxn, v.monthlyPriceMxn, 'monthlyPriceMxn'],
    ] as const) {
      if (monthly > 0 && annual <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message: t('monthlyNeedsAnnual') })
      }
    }
  })
}

export type PackageFormValues = z.infer<ReturnType<typeof getPackageSchema>>

export const packageDefaultValues: PackageFormValues = {
  name:        '',
  quantity:    1,
  description: '',
  termLength:      12,
  priceUsd:        0,
  monthlyPriceUsd: 0,
  priceBrl:        0,
  monthlyPriceBrl: 0,
  priceMxn:        0,
  monthlyPriceMxn: 0,
  isActive:    true,
}
