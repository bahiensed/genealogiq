import { z } from 'zod'
import type { Translator } from './i18n'
import { addressSchema, addressDefaultValues } from './address.schema'

export const ENTITY_TYPES = ['INDIVIDUAL', 'COMPANY'] as const

export function getCustomerSchema(t: Translator) {
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

export type CustomerFormValues = z.infer<ReturnType<typeof getCustomerSchema>>

export const customerDefaultValues: CustomerFormValues = {
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
