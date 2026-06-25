import { z } from 'zod'
import { addressSchema, addressDefaultValues } from './address.schema'
import { validateCpf, validateCnpj } from '@/lib/masks'
import type { Translator } from './i18n'

export const ENTITY_TYPES = ['INDIVIDUAL', 'COMPANY'] as const

function makeTaxIdRefine(t: Translator) {
  return (data: { entityType: string; taxId: string }, ctx: z.RefinementCtx) => {
    if (data.entityType === 'INDIVIDUAL') {
      if (!validateCpf(data.taxId)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('invalidCpf'), path: ['taxId'] })
      }
    } else {
      if (!validateCnpj(data.taxId)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('invalidCnpj'), path: ['taxId'] })
      }
    }
  }
}

function makeSupplierBaseSchema(t: Translator) {
  return z.object({
    entityType:            z.enum(ENTITY_TYPES),
    name:                  z.string().min(2, t('minChars', { count: 2 })),
    tradeName:             z.string().min(2, t('minChars', { count: 2 })),
    taxId:                 z.string().min(1, t('required')),
    stateRegistration:     z.string().nullish(),
    municipalRegistration: z.string().nullish(),
    birthDate:             z.string().nullish(),
    email:                 z.string().email(t('invalidEmail')),
    phoneCountryCode:      z.string().min(1, t('countryCodeRequired')),
    phone:                 z.string().min(1, t('required')),
    notes:                 z.string().nullish(),
    categoryId:            z.string().min(1, t('categoryRequired')),
    isActive:              z.boolean(),
    address:               addressSchema.optional(),
  })
}

export function getSupplierSchema(t: Translator) {
  return makeSupplierBaseSchema(t).superRefine(makeTaxIdRefine(t))
}

export type SupplierFormValues = z.infer<ReturnType<typeof getSupplierSchema>>

export const supplierDefaultValues: SupplierFormValues = {
  entityType:            'COMPANY',
  name:                  '',
  tradeName:             '',
  taxId:                 '',
  stateRegistration:     '',
  municipalRegistration: '',
  birthDate:             '',
  email:                 '',
  phoneCountryCode:      '55',
  phone:                 '',
  notes:                 '',
  categoryId:            '',
  isActive:              true,
  address:               addressDefaultValues,
}
