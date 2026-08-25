import { getLocale } from 'next-intl/server'
import { currencyForLocale } from '@genealogiq/core'
import { getActivePackages } from '@/queries/packages'
import { getActiveCustomers } from '@/queries/customers'
import { getSelectableCoupons } from '@/queries/discount-coupons'
import { SaleForm } from '@/components/sales/sale-form'
import { FormShell } from '@genealogiq/ui/form-shell'

export default async function NewManualSalePage() {
  const currency = currencyForLocale(await getLocale())

  const [packages, rawCustomers, coupons] = await Promise.all([
    getActivePackages(currency),
    getActiveCustomers(),
    getSelectableCoupons(currency),
  ])

  const customers = rawCustomers.map((c) => ({
    id:   c.id,
    name: c.entityType === 'INDIVIDUAL'
      ? `${c.name}${c.tradeName ? ` ${c.tradeName}` : ''}`.trim()
      : c.name,
  }))

  return (
    <FormShell>
      <SaleForm packages={packages} customers={customers} coupons={coupons} />
    </FormShell>
  )
}
