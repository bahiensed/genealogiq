import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { addressSchema, addressDefaultValues } from './address.schema'

export const ENTITY_TYPES = ['INDIVIDUAL', 'COMPANY'] as const

export const customerSchema = z.object({
  entityType:            z.enum(ENTITY_TYPES),
  name:                  z.string().min(2, 'Must be at least 2 characters'),
  tradeName:             z.string().min(2, 'Must be at least 2 characters'),
  taxId:                 z.string().min(1, 'Required'),
  stateRegistration:     z.string().nullish(),
  municipalRegistration: z.string().nullish(),
  birthDate:             z.string().nullish(),
  email:                 z.string().email('Invalid email address'),
  phoneCountryCode:      z.string().min(1, 'Country code is required'),
  phone:                 z.string().min(1, 'Required'),
  notes:                 z.string().nullish(),
  categoryId:            z.string().min(1, 'Category is required'),
  isActive:              z.boolean(),
  moduleRecordsSuppliers:    z.boolean().default(false),
  moduleRecordsProducts:     z.boolean().default(false),
  moduleRecordsServices:     z.boolean().default(false),
  moduleCategoriesSuppliers: z.boolean().default(false),
  moduleCategoriesProducts:  z.boolean().default(false),
  moduleCategoriesServices:  z.boolean().default(false),
  modulePurchasingProducts:  z.boolean().default(false),
  modulePurchasingServices:  z.boolean().default(false),
  moduleInventoryProducts:   z.boolean().default(false),
  moduleFinance:             z.boolean().default(false),
  address:               addressSchema.optional(),
})

export const ownerSchema = z.object({
  firstName: z.string().min(2, 'Must be at least 2 characters'),
  lastName:  z.string().min(2, 'Must be at least 2 characters'),
  email:     z.string().email('Invalid email address'),
})

export const customerCreateSchema = customerSchema.extend({
  owner: ownerSchema,
})

export type CustomerFormValues       = z.infer<typeof customerSchema>
export type OwnerFormValues          = z.infer<typeof ownerSchema>
export type CustomerCreateFormValues = z.infer<typeof customerCreateSchema>

export const customerResolver       = zodResolver(customerSchema)
export const customerCreateResolver = zodResolver(customerCreateSchema)

export const ownerDefaultValues: OwnerFormValues = {
  firstName: '',
  lastName:  '',
  email:     '',
}

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
  moduleRecordsSuppliers:    false,
  moduleRecordsProducts:     false,
  moduleRecordsServices:     false,
  moduleCategoriesSuppliers: false,
  moduleCategoriesProducts:  false,
  moduleCategoriesServices:  false,
  modulePurchasingProducts:  false,
  modulePurchasingServices:  false,
  moduleInventoryProducts:   false,
  moduleFinance:             false,
  address:               addressDefaultValues,
}

export const customerCreateDefaultValues: CustomerCreateFormValues = {
  ...customerDefaultValues,
  owner: ownerDefaultValues,
}
