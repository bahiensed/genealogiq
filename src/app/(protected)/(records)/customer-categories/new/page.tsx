import { CustomerCategoryForm } from '@/components/customer-categories/customer-category-form'

export default function NewCustomerCategoryPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        New customer category
      </h1>
      <CustomerCategoryForm />
    </div>
  )
}
