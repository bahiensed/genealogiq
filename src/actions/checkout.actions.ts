'use server'

import { verifyTenantSession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'

type ActionResult = { error: string } | { url: string }

export async function createPackageCheckoutSession(
  packageId: string,
  quantity: number,
): Promise<ActionResult> {
  await verifyTenantSession()

  if (!Number.isInteger(quantity) || quantity < 1) return { error: 'Invalid quantity.' }

  const pkg = await prisma.package.findUnique({
    where:  { id: packageId, isActive: true },
    select: { id: true },
  })
  if (!pkg) return { error: 'Package not found or unavailable.' }

  // Fake checkout: redirect to internal mock page. When Stripe is wired,
  // this action will return a real Stripe Checkout Session URL instead.
  const params = new URLSearchParams({
    type:      'qr-package',
    packageId: pkg.id,
    qty:       String(quantity),
    returnTo:  '/purchasing/packages',
  })
  return { url: `/stripe-mock?${params.toString()}` }
}
