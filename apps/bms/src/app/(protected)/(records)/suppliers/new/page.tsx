import { getSupplierCategories } from '@/queries/supplier-categories'
import { SupplierForm } from '@/components/suppliers/supplier-form'

export default async function NewSupplierPage() {
  const categories = await getSupplierCategories()
  return <SupplierForm categories={categories} />
}
