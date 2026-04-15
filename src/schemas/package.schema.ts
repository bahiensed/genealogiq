import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

export const packageSchema = z.object({
  licenseId:   z.string().min(1, 'License is required'),
  name:        z.string().min(2, 'Must be at least 2 characters'),
  quantity:    z.number().int('Must be a whole number').positive('Must be greater than zero'),
  description: z.string().optional(),
  price:       z.number().positive('Must be greater than zero'),
  isActive:    z.boolean(),
})

export type PackageFormValues = z.infer<typeof packageSchema>

export const packageResolver = zodResolver(packageSchema)

export const packageDefaultValues: PackageFormValues = {
  licenseId:   '',
  name:        '',
  quantity:    1,
  description: '',
  price:       0,
  isActive:    true,
}
