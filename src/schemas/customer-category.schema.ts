import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

export const customerCategorySchema = z.object({
  name:        z.string().min(8, 'Must be at least 8 characters').max(24, 'Must be at most 24 characters'),
  description: z.string().min(12, 'Must be at least 12 characters').max(48, 'Must be at most 48 characters'),
  isActive:    z.boolean(),
})

export type CustomerCategoryFormValues = z.infer<typeof customerCategorySchema>

export const customerCategoryResolver = zodResolver(customerCategorySchema)

export const customerCategoryDefaultValues: CustomerCategoryFormValues = {
  name:        '',
  description: '',
  isActive:    true,
}
