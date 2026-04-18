import { notFound } from 'next/navigation'
import { getLicense } from '@/queries/licenses'
import { LicenseForm } from '@/components/licenses/license-form'

export default async function EditLicensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const license = await getLicense(id)
  if (!license) notFound()

  return (
    <LicenseForm
      id={id}
      defaultValues={{
        name:        license.name,
        description: license.description ?? '',
        isActive:    license.isActive,
      }}
    />
  )
}
