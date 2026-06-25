import { z } from 'zod'
import type { Translator } from './i18n'

export function getPackageSchema(t: Translator) {
  return z.object({
    name:        z.string()
      .min(4, t('minChars', { count: 4 }))
      .max(32, t('maxChars', { count: 32 })),
    quantity:    z.number().int(t('wholeNumber')).positive(t('greaterThanZero')),
    description: z.string()
      .min(12, t('minChars', { count: 12 }))
      .max(256, t('maxChars', { count: 256 })),
    price:       z.number().positive(t('greaterThanZero')),
    isActive:    z.boolean(),
    type:        z.enum(['DIGITAL', 'PHYSICAL']),
  })
}

export type PackageFormValues = z.infer<ReturnType<typeof getPackageSchema>>

export const packageDefaultValues: PackageFormValues = {
  name:        '',
  quantity:    1,
  description: '',
  price:       0,
  isActive:    true,
  type:        'DIGITAL',
}
