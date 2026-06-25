import { z } from 'zod'
import type { Translator } from './i18n'
import { addressSchema, addressDefaultValues } from './address.schema'

export function getCompanySchema(t: Translator) {
  return z.object({
    legalName:              z.string().min(2, t('minChars', { count: 2 })),
    tradeName:              z.string().min(2, t('minChars', { count: 2 })),
    taxId:                  z.string().min(1, t('required')),
    stateRegistration:      z.string().nullish(),
    municipalRegistration:  z.string().nullish(),
    email:                  z.string().email(t('invalidEmail')),
    phoneCountryCode:       z.string().min(1, t('countryCodeRequired')),
    phone:                  z.string().min(1, t('required')),
    isActive:               z.boolean(),
    address:                addressSchema.optional(),
  })
}

export type CompanyFormValues = z.infer<ReturnType<typeof getCompanySchema>>

export const companyDefaultValues: CompanyFormValues = {
  legalName:             '',
  tradeName:             '',
  taxId:                 '',
  stateRegistration:     '',
  municipalRegistration: '',
  email:                 '',
  phoneCountryCode:      '55',
  phone:                 '',
  isActive:              true,
  address:               addressDefaultValues,
}
