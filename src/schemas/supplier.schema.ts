import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { addressSchema, addressDefaultValues } from './address.schema'
import { validateCpf, validateCnpj } from '@/lib/masks'

export const ENTITY_TYPES = ['INDIVIDUAL', 'COMPANY'] as const

export const supplierSchema = z.object({
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
  address:               addressSchema.optional(),
}).superRefine((data, ctx) => {
  if (data.entityType === 'INDIVIDUAL') {
    if (!validateCpf(data.taxId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid CPF', path: ['taxId'] })
    }
  } else {
    if (!validateCnpj(data.taxId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid CNPJ', path: ['taxId'] })
    }
  }
})

export type SupplierFormValues = z.infer<typeof supplierSchema>

export const supplierResolver = zodResolver(supplierSchema)

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
