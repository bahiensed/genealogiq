import { z } from 'zod'
import type { Translator } from './i18n'

export function getExtraUnitPriceSchema(t: Translator) {
  return z.object({
    // 0 = not configured for this currency — for USD specifically on a
    // MEMORIAL row this also means "not purchasable at this tier at all"
    // (no fallback), same convention as Subscription's price fields.
    priceUsd: z.number().min(0, t('priceMin')),
    priceBrl: z.number().min(0, t('priceMin')),
    priceMxn: z.number().min(0, t('priceMin')),
  })
}

export type ExtraUnitPriceFormValues = z.infer<ReturnType<typeof getExtraUnitPriceSchema>>
