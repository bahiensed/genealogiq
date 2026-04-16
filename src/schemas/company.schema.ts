import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { addressSchema, addressDefaultValues } from './address.schema'

export const companySchema = z.object({
  legalName:              z.string().min(2, 'Must be at least 2 characters'),
  tradeName:              z.string().min(2, 'Must be at least 2 characters'),
  taxId:                  z.string().min(1, 'CNPJ is required'),
  stateRegistration:      z.string().nullish(),
  municipalRegistration:  z.string().nullish(),
  email:                  z.string().email('Invalid email'),
  phoneCountryCode:       z.string().min(1, 'Country code is required'),
  phone:                  z.string().min(1, 'Phone is required'),
  isActive:               z.boolean(),
  address:                addressSchema.optional(),
})

export type CompanyFormValues = z.infer<typeof companySchema>

export const companyResolver = zodResolver(companySchema)

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
