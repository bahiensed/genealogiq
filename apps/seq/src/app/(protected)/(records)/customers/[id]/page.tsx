import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { getCustomer } from '@/queries/customers'
import { getCustomerCategories } from '@/queries/customer-categories'
import { CustomerForm } from '@/components/customers/customer-form'
import { MemorializedDataTable } from '@/components/memorialized/memorialized-data-table'
import { Button } from '@genealogiq/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@genealogiq/ui/card'
import { Separator } from '@genealogiq/ui/separator'
import type { AppUserFormValues } from '@/schemas/app-user.schema'

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {

  const { id } = await params
  const [customer, categories] = await Promise.all([
    getCustomer(id),
    getCustomerCategories(),
  ])
  if (!customer) notFound()

  const t = await getTranslations('Customers')

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

  const acquiredQRCodes   = customer._count.appSales
  const createdProfiles   = customer._count.guardiansOf
  const availableProfiles = Math.max(0, acquiredQRCodes - createdProfiles)

  const memorializedProfiles = customer.guardiansOf.map(({ appUser }) => appUser)

  return (
    <div className="flex flex-col gap-6 pb-16">
      <CustomerForm
        id={id}
        name={`${customer.firstName} ${customer.lastName}`}
        categories={categories}
        defaultValues={defaultValues}
      />

      <Separator />

      {/* ── Memorialized profiles ── */}
      <section id="memorialized-profiles" className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="scroll-m-20 text-4xl font-semibold tracking-tight text-balance">{t('memorialized.title')}</h2>
          {availableProfiles > 0 && (
            <Button asChild>
              <Link href={`/customers/${id}/memorialized/new`}>
                {t('memorialized.create')}
              </Link>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:max-w-3xl">
          <StatCard label={t('memorialized.acquiredQrCodesLabel')} value={acquiredQRCodes} />
          <StatCard label={t('memorialized.availableProfilesLabel')} value={availableProfiles} highlight={availableProfiles > 0} />
          <StatCard label={t('memorialized.createdProfilesLabel')} value={createdProfiles} />
        </div>

        <MemorializedDataTable data={memorializedProfiles} />
      </section>
    </div>
  )
}

function StatCard({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <Card size="sm" className="gap-2">
      <CardHeader>
        <CardDescription className="min-h-[2.5em] leading-snug whitespace-pre-line">{label}</CardDescription>
        <CardTitle className={`text-5xl font-bold tabular-nums ${highlight ? 'text-primary' : ''}`}>
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  )
}
