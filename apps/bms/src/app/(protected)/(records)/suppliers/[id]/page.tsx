import { notFound } from 'next/navigation'
import { getSupplier } from '@/queries/suppliers'
import { getSupplierCategories } from '@/queries/supplier-categories'
import { SupplierForm } from '@/components/suppliers/supplier-form'

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [supplier, categories] = await Promise.all([
    getSupplier(id),
    getSupplierCategories(),
  ])
  if (!supplier) notFound()

  return (
    <SupplierForm
        id={id}
        categories={categories}
        defaultValues={{
          entityType:            supplier.entityType as 'INDIVIDUAL' | 'COMPANY',
          name:                  supplier.name,
          tradeName:             supplier.tradeName,
          taxId:                 supplier.taxId,
          stateRegistration:     supplier.stateRegistration     ?? '',
          municipalRegistration: supplier.municipalRegistration ?? '',
          birthDate:             supplier.birthDate ? supplier.birthDate.toISOString().slice(0, 10) : '',
          email:                 supplier.email,
          phoneCountryCode:      supplier.phoneCountryCode,
          phone:                 supplier.phone,
          notes:                 supplier.notes                 ?? '',
          categoryId:            supplier.categoryId            ?? '',
          isActive:              supplier.isActive,
          address: supplier.address ? {
            zip:          supplier.address.zip          ?? '',
            street:       supplier.address.street       ?? '',
            number:       supplier.address.number       ?? '',
            complement:   supplier.address.complement   ?? '',
            neighborhood: supplier.address.neighborhood ?? '',
            city:         supplier.address.city         ?? '',
            state:        supplier.address.state        ?? '',
            country:      supplier.address.country      ?? 'BR',
          } : undefined,
        }}
    />
  )
}
