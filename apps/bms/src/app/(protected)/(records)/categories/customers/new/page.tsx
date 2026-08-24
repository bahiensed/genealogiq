import { CustomerCategoryForm } from '@/components/customer-categories/customer-category-form'
import { FormShell } from '@genealogiq/ui/form-shell'

export default function NewCustomerCategoryPage() {
  return (
    <FormShell>
      <CustomerCategoryForm />
    </FormShell>
  )
}
