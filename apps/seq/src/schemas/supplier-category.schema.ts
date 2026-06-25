import { z } from 'zod'
import type { Translator } from './i18n'

export function getSupplierCategorySchema(t: Translator) {
  return z.object({
    name:        z.string().min(8, t('minChars', { count: 8 })).max(24, t('maxChars', { count: 24 })),
    description: z.string().min(12, t('minChars', { count: 12 })).max(48, t('maxChars', { count: 48 })),
    isActive:    z.boolean(),
  })
}

export type SupplierCategoryFormValues = z.infer<ReturnType<typeof getSupplierCategorySchema>>

export const supplierCategoryDefaultValues: SupplierCategoryFormValues = {
  name:        '',
  description: '',
  isActive:    true,
}
