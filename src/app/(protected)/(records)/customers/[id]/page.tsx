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
    gender:           (customer.gender as AppUserFormValues['gender']) ?? null,
    birthDate:        customer.birthDate ? customer.birthDate.toISOString().slice(0, 10) : '',
    birthCity:        customer.birthCity        ?? '',
    birthState:       customer.birthState       ?? '',
    birthCountry:     customer.birthCountry     ?? '',
    email:            customer.email            ?? '',
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
    otherSocial:      customer.otherSocial      ?? '',
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

  const qrCodesAcquired  = customer._count.appSales
  const qrCodesUsed      = customer._count.guardiansOf
  const qrCodesAvailable = Math.max(0, qrCodesAcquired - qrCodesUsed)

  const memorializedProfiles = customer.guardiansOf.map(({ appUser }) => appUser)

  return (
    <div className="flex flex-col gap-6">
      <CustomerForm
        id={id}
        name={`${customer.firstName} ${customer.lastName}`}
        categories={categories}
        defaultValues={defaultValues}
      />

      {/* ── Memorialized profiles ── */}
      <section className="flex flex-col gap-4 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Memorialized profiles</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{qrCodesAcquired} QR codes acquired</Badge>
              <Badge variant="outline">{qrCodesUsed} used</Badge>
              <Badge variant={qrCodesAvailable > 0 ? 'default' : 'secondary'}>
                {qrCodesAvailable} available
              </Badge>
            </div>
          </div>
          {qrCodesAvailable > 0 && (
            <Button asChild>
              <Link href={`/customers/${id}/memorialized/new`}>
                Create memorialized profile
              </Link>
            </Button>
          )}
        </div>

        <MemorializedDataTable data={memorializedProfiles} />
      </section>
    </div>
  )
}
