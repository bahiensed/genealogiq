import { notFound } from 'next/navigation'
import { getCustomer } from '@/queries/customers'
import { getCustomerCategories } from '@/queries/customer-categories'
import { CustomerForm } from '@/components/customers/customer-form'
import type { AppUserFormValues } from '@/schemas/app-user.schema'

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {

  const { id } = await params
  const [customer, categories] = await Promise.all([
    getCustomer(id),
    getCustomerCategories(),
  ])
  if (!customer) notFound()

  const defaultValues: AppUserFormValues = {
    firstName:        customer.firstName,
    lastName:         customer.lastName,
    gender:           (customer.gender as AppUserFormValues['gender']) ?? null,
    birthDate:        customer.birthDate ? customer.birthDate.toISOString().slice(0, 10) : '',
    birthCity:        customer.birthCity        ?? '',
    birthState:       customer.birthState       ?? '',
    birthCountry:     customer.birthCountry     ?? '',
    email:            customer.email,
    phoneCountryCode: customer.phoneCountryCode,
    phone:            customer.phone            ?? '',
    categoryId:       customer.categoryId       ?? '',
    notes:            customer.notes            ?? '',
    isActive:         customer.isActive,
    fb:               customer.fb               ?? '',
    instagram:        customer.instagram        ?? '',
    linkedin:         customer.linkedin         ?? '',
    tiktok:           customer.tiktok           ?? '',
    x:                customer.x                ?? '',
    youtube:          customer.youtube          ?? '',
    website:          customer.website          ?? '',
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
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        Editar cliente
      </h1>
      <CustomerForm
        id={id}
        categories={categories}
        defaultValues={defaultValues}
      />
    </div>
  )
}
