import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

export const supplierCategorySchema = z.object({
  name:        z.string().min(8, 'Must be at least 8 characters').max(24, 'Must be at most 24 characters'),
  description: z.string().min(12, 'Must be at least 12 characters').max(48, 'Must be at most 48 characters'),
  isActive:    z.boolean(),
})

export type SupplierCategoryFormValues = z.infer<typeof supplierCategorySchema>

export const supplierCategoryResolver = zodResolver(supplierCategorySchema)

export const supplierCategoryDefaultValues: SupplierCategoryFormValues = {
  name:        '',
  description: '',
  isActive:    true,
}
