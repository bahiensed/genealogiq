import Link from 'next/link'
import { forbidden } from 'next/navigation'
import { getCustomerModules } from '@/lib/dal'
import { getSupplierCategories } from '@/queries/supplier-categories'
import { SupplierCategoriesDataTable } from '@/components/supplier-categories/supplier-categories-data-table'
import { Button } from '@/components/ui/button'

export default async function SupplierCategoriesPage() {
  const modules = await getCustomerModules()
  if (!modules?.moduleCategoriesSuppliers) forbidden()

  const categories = await getSupplierCategories()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          Categorias de Fornecedores
        </h1>
        <Button asChild>
          <Link href="/supplier-categories/new">Nova categoria</Link>
        </Button>
      </div>

      <SupplierCategoriesDataTable data={categories} />
    </div>
  )
}
