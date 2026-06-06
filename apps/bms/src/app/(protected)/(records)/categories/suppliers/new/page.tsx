import { SupplierCategoryForm } from '@/components/supplier-categories/supplier-category-form'

export default function NewSupplierCategoryPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        New supplier category
      </h1>
      <SupplierCategoryForm />
    </div>
  )
}
