import { getActivePackages } from '@/queries/packages'
import { getActiveCustomers } from '@/queries/customers'
import { SaleForm } from '@/components/sales/sale-form'

export default async function NewManualSalePage() {
  const [packages, rawCustomers] = await Promise.all([
    getActivePackages(),
    getActiveCustomers(),
  ])

  const customers = rawCustomers.map((c) => ({
    id:   c.id,
    name: c.entityType === 'INDIVIDUAL'
      ? `${c.name}${c.tradeName ? ` ${c.tradeName}` : ''}`.trim()
      : c.name,
  }))

  return <SaleForm packages={packages} customers={customers} />
}
