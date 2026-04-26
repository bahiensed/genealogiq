import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

export const saleSchema = z.object({
  packageId:  z.string().min(1, 'Package is required'),
  tenantId:   z.string().min(1, 'Customer is required'),
  quantity:   z.number().int('Must be a whole number').positive('Must be greater than zero'),
})

export type SaleFormValues = z.infer<typeof saleSchema>

export const saleResolver = zodResolver(saleSchema)

export const saleDefaultValues: SaleFormValues = {
  packageId:  '',
  tenantId:   '',
  quantity:   1,
}
