import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

export const licenseSchema = z.object({
  component:   z.string()
    .min(4, 'Must be at least 4 characters')
    .max(16, 'Must be at most 16 characters'),
  description: z.string()
    .min(12, 'Must be at least 12 characters')
    .max(32, 'Must be at most 32 characters')
    .optional(),
  isActive:    z.boolean(),
})

export type LicenseFormValues = z.infer<typeof licenseSchema>

export const licenseResolver = zodResolver(licenseSchema)

export const licenseDefaultValues: LicenseFormValues = {
  component:   '',
  description: '',
  isActive:    true,
}
