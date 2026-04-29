import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

export const licenseSchema = z.object({
  name:        z.string()
    .min(4, 'Must be at least 4 characters')
    .max(64, 'Must be at most 64 characters'),
  description: z.string().max(128, 'Must be at most 128 characters').optional(),
  maxProfiles: z.number().int('Must be a whole number').positive('Must be greater than zero'),
  termLength:  z.number().int('Must be a whole number').min(0, 'Must be 0 (lifetime) or a positive number of months'),
  price:       z.number().min(0, 'Must be 0 (free) or greater'),
  isActive:    z.boolean(),
})

export type LicenseFormValues = z.infer<typeof licenseSchema>

export const licenseResolver = zodResolver(licenseSchema)

export const licenseDefaultValues: LicenseFormValues = {
  name:        '',
  description: '',
  maxProfiles: 1,
  termLength:  12,
  price:       0,
  isActive:    true,
}
