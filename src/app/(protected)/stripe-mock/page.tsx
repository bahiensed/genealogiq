import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { verifyTenantSession } from '@/lib/dal'
import { StripeMockContent } from '@/components/stripe-mock-content'

interface Props {
  searchParams: Promise<{ type?: string; packageId?: string; qty?: string; returnTo?: string }>
}

export default async function StripeMockPage({ searchParams }: Props) {
  await verifyTenantSession()
  const { type, packageId, qty, returnTo } = await searchParams

  if (type !== 'qr-package' || !packageId) notFound()

  const pkg = await prisma.package.findUnique({
    where:  { id: packageId, isActive: true },
    select: { id: true, name: true, description: true, price: true, quantity: true },
  })
  if (!pkg) notFound()

  const quantity = Math.max(1, Number(qty) || 1)
  const unitPrice = Number(pkg.price)
  const total = unitPrice * quantity

  return (
    <StripeMockContent
      packageId={pkg.id}
      packageName={pkg.name}
      packageDescription={pkg.description}
      qrPerPackage={pkg.quantity}
      quantity={quantity}
      unitPrice={unitPrice}
      total={total}
      returnTo={returnTo ?? '/purchasing/packages'}
    />
  )
}
