import { getCustomerCategories } from '@/queries/customer-categories'
import { CustomerNewForm } from '@/components/customers/customer-new-form'
import { FormShell } from '@genealogiq/ui/form-shell'

export default async function NewCustomerPage() {
  const categories = await getCustomerCategories()
  return (
    <FormShell>
      <CustomerNewForm categories={categories} />
    </FormShell>
  )
}
