'use server'

import { getLocale, getTranslations } from 'next-intl/server'
import { ok, fail, type ActionResult } from '@genealogiq/core'
import { verifyTenantSession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { ensureTenantStripeCustomer } from '@/lib/billing'
import { currencyForLocale } from '@genealogiq/core'

export async function createPackageCheckoutSession(
  packageId: string,
  quantity:  number,
): Promise<ActionResult<{ url: string }>> {
  const t = await getTranslations('Actions')

  const session    = await verifyTenantSession()
  const { customerId: tenantId } = session
  const soldById   = session.user.id

  if (!Number.isInteger(quantity) || quantity < 1) return fail(t('checkout.invalidQuantity'))

  // The catalogue is priced per currency and the tenant's interface language
  // picks one — the same rule BMS follows when it generates a payment link.
  const currency = currencyForLocale(await getLocale())
  // Annual only until cadence selection lands; the monthly ids exist but are
  // not offered here yet.
  const PRICE_ID = { usd: 'stripeAnnualPriceIdUsd', brl: 'stripeAnnualPriceIdBrl', mxn: 'stripeAnnualPriceIdMxn' } as const

  const pkg = await prisma.package.findUnique({
    where:  { id: packageId, isActive: true },
    select: { id: true, stripeAnnualPriceIdUsd: true, stripeAnnualPriceIdBrl: true, stripeAnnualPriceIdMxn: true },
  })
  if (!pkg) return fail(t('checkout.packageNotFound'))

  const priceId = pkg[PRICE_ID[currency]]
  if (!priceId) {
    return fail(t('checkout.notSynced'))
  }

  const customer = await ensureTenantStripeCustomer(tenantId)
  const baseUrl  = process.env.SEQUOIA_URL ?? 'http://localhost:3000'
  // Return the buyer to the page they purchased from (digital vs physical).
  const returnPath = '/purchasing/gencodes'
  const metadata = { tenantId, packageId: pkg.id, quantity: String(quantity), soldById }

  const checkout = await stripe.checkout.sessions.create({
    mode:                  'payment',
    customer,
    line_items:            [{ price: priceId, quantity }],
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
