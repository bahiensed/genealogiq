import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCustomer } from '@/queries/customers'
import { getCustomerCategories } from '@/queries/customer-categories'
import { CustomerForm } from '@/components/customers/customer-form'
import { MemorializedDataTable } from '@/components/memorialized/memorialized-data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
    gender:           (customer.gender as AppUserFormValues['gender']) ?? 'MALE',
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
    outro:            customer.outro            ?? '',
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

  const licensesAcquired = customer._count.appSales
  const licensesUsed     = customer._count.guardianships
  const licensesAvailable = Math.max(0, licensesAcquired - licensesUsed)

  const memorializedProfiles = customer.guardianships.map(({ deceased }) => deceased)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        {customer.firstName} {customer.lastName}
      </h1>
      <CustomerForm
        id={id}
        categories={categories}
        defaultValues={defaultValues}
      />

      {/* ── Perfis memorializados ── */}
      <section className="flex flex-col gap-4 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Perfis memorializados</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{licensesAcquired} adquirida{licensesAcquired !== 1 ? 's' : ''}</Badge>
              <Badge variant="outline">{licensesUsed} utilizada{licensesUsed !== 1 ? 's' : ''}</Badge>
              <Badge variant={licensesAvailable > 0 ? 'default' : 'secondary'}>
                {licensesAvailable} disponíve{licensesAvailable !== 1 ? 'is' : 'l'}
              </Badge>
            </div>
          </div>
          {licensesAvailable > 0 && (
            <Button asChild>
              <Link href={`/customers/${id}/memorialized/new`}>
                Criar perfil memorializado
              </Link>
            </Button>
          )}
        </div>

        <MemorializedDataTable data={memorializedProfiles} />
      </section>
    </div>
  )
}
