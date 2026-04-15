import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

export const saleSchema = z.object({
  packageId:  z.string().min(1, 'Package is required'),
  customerId: z.string().min(1, 'Customer is required'),
  quantity:   z.number().int('Must be a whole number').positive('Must be greater than zero'),
  soldAt:     z.string().min(1, 'Date is required'),
})

export type SaleFormValues = z.infer<typeof saleSchema>

export const saleResolver = zodResolver(saleSchema)

export const saleDefaultValues: SaleFormValues = {
  packageId:  '',
  customerId: '',
  quantity:   1,
  soldAt:     '',
}
