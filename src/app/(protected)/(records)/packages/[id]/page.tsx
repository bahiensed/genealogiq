import { notFound } from 'next/navigation'
import { getPackage } from '@/queries/packages'
import { PackageForm } from '@/components/packages/package-form'

export default async function EditPackagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const pkg = await getPackage(id)
  if (!pkg) notFound()

  return (
    <PackageForm
      id={id}
      defaultValues={{
        name:        pkg.name,
        quantity:    pkg.quantity,
        description: pkg.description ?? '',
        price:       Number(pkg.price),
        isActive:    pkg.isActive,
        type:        pkg.type,
      }}
      stripeProductId={pkg.stripeProductId}
      stripePriceId={pkg.stripePriceId}
    />
  )
}
