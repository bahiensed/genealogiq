import { notFound } from 'next/navigation'
import { getPackage } from '@/queries/packages'
import { PackageForm } from '@/components/packages/package-form'

export default async function EditPhysicalPackagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const pkg = await getPackage(id)
  if (!pkg || pkg.type !== 'PHYSICAL') notFound()

  return (
    <PackageForm
      id={id}
      defaultValues={{
        name:        pkg.name,
        quantity:    pkg.quantity,
        description: pkg.description ?? '',
        price:       Number(pkg.price),
        isActive:    pkg.isActive,
        type:        'PHYSICAL',
      }}
      stripeProductId={pkg.stripeProductId}
      stripePriceId={pkg.stripePriceId}
      fixedType="PHYSICAL"
      backHref="/physical-qr"
    />
  )
}
