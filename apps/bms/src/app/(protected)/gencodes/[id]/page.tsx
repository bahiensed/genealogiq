import { notFound } from 'next/navigation'
import { getPackage } from '@/queries/packages'
import { PackageForm } from '@/components/packages/package-form'
import { FormShell } from '@genealogiq/ui/form-shell'

export default async function EditGenCodeProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const pkg = await getPackage(id)
  if (!pkg) notFound()

  return (
    <FormShell>
      <PackageForm
      id={id}
      defaultValues={{
        name:        pkg.name,
        quantity:    pkg.quantity,
        description: pkg.description ?? '',
        price:       Number(pkg.price),
        isActive:    pkg.isActive,
      }}
      stripeProductId={pkg.stripeProductId}
      stripePriceId={pkg.stripePriceId}
      />
    </FormShell>
  )
}
