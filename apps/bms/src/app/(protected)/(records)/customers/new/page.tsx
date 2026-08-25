import { CustomerNewForm } from '@/components/customers/customer-new-form'
import { FormShell } from '@genealogiq/ui/form-shell'

export default function NewCustomerPage() {
  return (
    <FormShell>
      <CustomerNewForm />
    </FormShell>
  )
}
