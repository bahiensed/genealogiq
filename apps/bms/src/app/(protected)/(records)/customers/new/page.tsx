import { getCustomerCategories } from '@/queries/customer-categories'
import { CustomerNewForm } from '@/components/customers/customer-new-form'

export default async function NewCustomerPage() {
  const categories = await getCustomerCategories()
  return <CustomerNewForm categories={categories} />
}
