'use server'

import { getTranslations } from 'next-intl/server'
import { ok, fail, type ActionResult } from '@genealogiq/core'
import { verifyTenantSession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { ensureTenantStripeCustomer } from '@/lib/billing'

export async function createPackageCheckoutSession(
  packageId: string,
  quantity:  number,
): Promise<ActionResult<{ url: string }>> {
  const t = await getTranslations('Actions')

  const session    = await verifyTenantSession()
  const { customerId: tenantId } = session
  const soldById   = session.user.id

  if (!Number.isInteger(quantity) || quantity < 1) return fail(t('checkout.invalidQuantity'))

  const pkg = await prisma.package.findUnique({
    where:  { id: packageId, isActive: true },
    select: { id: true, type: true, stripePriceId: true },
  })
  if (!pkg) return fail(t('checkout.packageNotFound'))
  if (!pkg.stripePriceId) {
    return fail(t('checkout.notSynced'))
  }

  const customer = await ensureTenantStripeCustomer(tenantId)
  const baseUrl  = process.env.SEQUOIA_URL ?? 'http://localhost:3000'
  // Return the buyer to the page they purchased from (digital vs physical).
  const returnPath = pkg.type === 'PHYSICAL' ? '/purchasing/gencodes' : '/purchasing/digital-qr'
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

  if (!checkout.url) return fail(t('checkout.noCheckoutUrl'))
  return ok({ url: checkout.url })
}
