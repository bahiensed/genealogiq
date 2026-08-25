'use server'

import { getLocale, getTranslations } from 'next-intl/server'
import { ok, fail, currencyForLocale, currencyCode, type ActionResult } from '@genealogiq/core'
import { verifyTenantSession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { ensureTenantStripeCustomer } from '@/lib/billing'
import { CHECKOUT_ORIGINS } from '@genealogiq/services/gencode-fulfilment'

const PRICE_ID_BY_CADENCE = {
  annual:  { usd: 'stripeAnnualPriceIdUsd',  brl: 'stripeAnnualPriceIdBrl',  mxn: 'stripeAnnualPriceIdMxn'  },
  monthly: { usd: 'stripeMonthlyPriceIdUsd', brl: 'stripeMonthlyPriceIdBrl', mxn: 'stripeMonthlyPriceIdMxn' },
} as const

/** Stripe's ceiling is 30 days; a week is long enough for a tenant to finish paying. */
const SESSION_TTL_DAYS = 7

/**
 * A tenant buying GenCodes for themselves.
 *
 * The mirror of BMS's payment link, and it shares everything downstream: the
 * same Sale row written before the session exists, the same subscription
 * metadata, the same fulfilment. Only the origin marker differs, and that is
 * what makes exactly one of the two webhooks act on the event Stripe sends to
 * both.
 *
 * Currency and cadence both come from the tenant: currency from the language
 * they are browsing in, cadence from what they pick.
 */
export async function createPackageCheckoutSession(
  packageId: string,
  quantity:  number,
  cadence:   'annual' | 'monthly',
): Promise<ActionResult<{ url: string }>> {
  const t = await getTranslations('Actions')

  const session = await verifyTenantSession()
  const { customerId: tenantId } = session
  const soldById = session.user.id

  if (!Number.isInteger(quantity) || quantity < 1) return fail(t('checkout.invalidQuantity'))

  const currency = currencyForLocale(await getLocale())

  const pkg = await prisma.package.findUnique({
    where:  { id: packageId, isActive: true },
    select: {
      id: true, name: true, termLength: true,
      stripeAnnualPriceIdUsd:  true, stripeAnnualPriceIdBrl:  true, stripeAnnualPriceIdMxn:  true,
      stripeMonthlyPriceIdUsd: true, stripeMonthlyPriceIdBrl: true, stripeMonthlyPriceIdMxn: true,
    },
  })
  if (!pkg) return fail(t('checkout.packageNotFound'))

  const priceId = pkg[PRICE_ID_BY_CADENCE[cadence][currency]]
  if (!priceId) return fail(t('checkout.notSyncedInCurrency', { currency: currencyCode(currency) }))

  const customer  = await ensureTenantStripeCustomer(tenantId)
  const baseUrl   = process.env.SEQUOIA_URL ?? 'http://localhost:3000'
  const returnPath = '/purchasing/gencodes'

  // Written before the session exists, exactly as BMS does: it is the row the
  // webhook finds by saleId, and it is what makes the purchase visible as
  // awaiting payment rather than appearing from nowhere once Stripe settles.
  const sale = await prisma.sale.create({
    data: { packageId: pkg.id, tenantId, quantity, soldById, cadence },
    select: { id: true },
  })

  try {
    const metadata = {
      origin:     CHECKOUT_ORIGINS.seq,
      saleId:     String(sale.id),
      tenantId,
      packageId:  pkg.id,
      quantity:   String(quantity),
      soldById,
      cadence,
      termLength: String(pkg.termLength),
    }

    const checkout = await stripe.checkout.sessions.create({
      mode:                'subscription',
      customer,
      line_items:          [{ price: priceId, quantity }],
      client_reference_id: tenantId,
      metadata,
      // Stamped on the SUBSCRIPTION, not just the session — the webhook reads it
      // from there and nowhere else.
      subscription_data:   { metadata },
      expires_at:          Math.floor((Date.now() + SESSION_TTL_DAYS * 86_400_000) / 1000),
      success_url:         `${baseUrl}${returnPath}?status=success`,
      cancel_url:          `${baseUrl}${returnPath}?status=cancel`,
      allow_promotion_codes: true,
    })

    if (!checkout.url) throw new Error('Stripe returned a session with no URL')

    await prisma.sale.update({
      where: { id: sale.id },
      data:  {
        stripeSessionId: checkout.id,
        checkoutUrl:     checkout.url,
        amountSubtotal:  checkout.amount_subtotal,
        amountTotal:     checkout.amount_total,
        currency:        checkout.currency,
      },
    })

    return ok({ url: checkout.url })
  } catch {
    // An order with no session is one nobody can pay and nobody can see the
    // state of. Same reasoning as BMS: delete rather than leave it awaiting
    // payment forever.
    await prisma.sale.delete({ where: { id: sale.id } }).catch(() => {})
    return fail(t('checkout.noCheckoutUrl'))
  }
}
