import { notFound } from 'next/navigation'
import { getCustomer } from '@/queries/customers'
import { getCustomerCategories } from '@/queries/customer-categories'
import { CustomerForm } from '@/components/customers/customer-form'

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [customer, categories] = await Promise.all([getCustomer(id), getCustomerCategories()])
  if (!customer) notFound()

  return (
    <CustomerForm
      id={id}
      categories={categories}
      defaultValues={{
        entityType:            customer.entityType as 'INDIVIDUAL' | 'COMPANY',
        name:                  customer.name,
        tradeName:             customer.tradeName,
        taxId:                 customer.taxId,
        stateRegistration:     customer.stateRegistration     ?? '',
        municipalRegistration: customer.municipalRegistration ?? '',
        birthDate:             customer.birthDate ? customer.birthDate.toISOString().slice(0, 10) : '',
        email:                 customer.email,
        phoneCountryCode:      customer.phoneCountryCode,
        phone:                 customer.phone,
        notes:                 customer.notes                 ?? '',
        categoryId:            customer.categoryId            ?? '',
        isActive:              customer.isActive,
        moduleRecordsSuppliers:    customer.moduleRecordsSuppliers,
        moduleRecordsProducts:     customer.moduleRecordsProducts,
        moduleRecordsServices:     customer.moduleRecordsServices,
        moduleCategoriesSuppliers: customer.moduleCategoriesSuppliers,
        moduleCategoriesProducts:  customer.moduleCategoriesProducts,
        moduleCategoriesServices:  customer.moduleCategoriesServices,
        modulePurchasingProducts:  customer.modulePurchasingProducts,
        modulePurchasingServices:  customer.modulePurchasingServices,
        moduleInventoryProducts:   customer.moduleInventoryProducts,
        moduleFinance:             customer.moduleFinance,
        address: customer.address ? {
          zip:          customer.address.zip          ?? '',
          street:       customer.address.street       ?? '',
          number:       customer.address.number       ?? '',
          complement:   customer.address.complement   ?? '',
          neighborhood: customer.address.neighborhood ?? '',
          city:         customer.address.city         ?? '',
          state:        customer.address.state        ?? '',
          country:      customer.address.country      ?? 'BR',
        } : undefined,
      }}
    />
  )
}
