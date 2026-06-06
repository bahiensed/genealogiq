'use server'

import { verifyTenantSession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { ensureTenantStripeCustomer } from '@/lib/billing'

type ActionResult = { error: string } | { url: string }

export async function createPackageCheckoutSession(
  packageId: string,
  quantity:  number,
): Promise<ActionResult> {
  const session    = await verifyTenantSession()
  const { customerId: tenantId } = session
  const soldById   = session.user.id

  if (!Number.isInteger(quantity) || quantity < 1) return { error: 'Invalid quantity.' }

  const pkg = await prisma.package.findUnique({
    where:  { id: packageId, isActive: true },
    select: { id: true, type: true, stripePriceId: true },
  })
  if (!pkg) return { error: 'Package not found or unavailable.' }
  if (!pkg.stripePriceId) {
    return { error: 'This package is not synced with Stripe. Run prisma/seed-stripe-packages.ts.' }
  }

  const customer = await ensureTenantStripeCustomer(tenantId)
  const baseUrl  = process.env.SEQUOIA_URL ?? 'http://localhost:3000'
  // Return the buyer to the page they purchased from (digital vs physical).
  const returnPath = pkg.type === 'PHYSICAL' ? '/purchasing/physical-qr' : '/purchasing/digital-qr'
  const metadata = { tenantId, packageId: pkg.id, quantity: String(quantity), soldById }

  const checkout = await stripe.checkout.sessions.create({
    mode:                  'payment',
    customer,
    line_items:            [{ price: pkg.stripePriceId, quantity }],
    client_reference_id:   tenantId,
    metadata,
    payment_intent_data:   { metadata },
    success_url:           `${baseUrl}${returnPath}?status=success`,
    cancel_url:            `${baseUrl}${returnPath}?status=cancel`,
    allow_promotion_codes: true,
  })

  if (!checkout.url) return { error: 'Stripe did not return a checkout URL.' }
  return { url: checkout.url }
}
