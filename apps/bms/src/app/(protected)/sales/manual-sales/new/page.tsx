import { getActivePackages } from '@/queries/packages'
import { getActiveCustomers } from '@/queries/customers'
import { SaleForm } from '@/components/sales/sale-form'
import { FormShell } from '@genealogiq/ui/form-shell'

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

  return (
    <FormShell>
      <SaleForm packages={packages} customers={customers} />
    </FormShell>
  )
}
