import { z } from 'zod'
import type { Translator } from './i18n'

export function getSaleSchema(t: Translator) {
  return z.object({
    packageId:  z.string().min(1, t('required')),
    tenantId:   z.string().min(1, t('required')),
    quantity:   z.number().int(t('mustBeWholeNumber')).positive(t('mustBePositive')),
  })
}

export type SaleFormValues = z.infer<ReturnType<typeof getSaleSchema>>

export const saleDefaultValues: SaleFormValues = {
  packageId:  '',
  tenantId:   '',
  quantity:   1,
}
