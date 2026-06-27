import { notFound } from 'next/navigation'
import { getCompany } from '@/queries/company'
import { CompanyForm } from '@/components/company/company-form'

export default async function CompanyPage() {
  const company = await getCompany()
  if (!company) notFound()

  return (
    <CompanyForm
      id={company.id}
      defaultValues={{
        legalName:             company.legalName,
        tradeName:             company.tradeName,
        taxId:                 company.taxId,
        stateRegistration:     company.stateRegistration ?? '',
        municipalRegistration: company.municipalRegistration ?? '',
        email:                 company.email,
        phoneCountryCode:      company.phoneCountryCode,
        phone:                 company.phone,
        isActive:              company.isActive,
        address: company.address ? {
          zip:          company.address.zip          ?? '',
          street:       company.address.street       ?? '',
          number:       company.address.number       ?? '',
          complement:   company.address.complement   ?? '',
          neighborhood: company.address.neighborhood ?? '',
          city:         company.address.city         ?? '',
          state:        company.address.state        ?? '',
          country:      company.address.country      ?? 'BR',
        } : undefined,
      }}
    />
  )
}
