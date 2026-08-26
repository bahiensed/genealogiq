'use server'

import { getLocale, getTranslations } from 'next-intl/server'
import { ok, fail, currencyForLocale, currencyCode, type ActionResult } from '@genealogiq/core'
import { verifyTenantSession } from '@/lib/dal'
import {
  openPartnerCheckout,
  PartnerCheckoutError,
  CHECKOUT_ORIGINS,
  type PartnerCadence,
} from '@genealogiq/services/partner-checkout'

/**
 * A partner subscribing to a plan for themselves.
 *
 * The mirror of BMS's payment link, and it shares everything downstream: the
 * same contract row written before the session exists, the same subscription
 * metadata, the same cycle. Only the origin marker and what happens with the
 * URL differ.
 *
 * Currency comes from the language the partner is browsing in — never converted
 * at checkout, per the price book's whole design. Cadence is their choice.
 */
export async function subscribeToPartnerPlan(
  planId:  string,
  cadence: PartnerCadence,
): Promise<ActionResult<{ url: string }>> {
  const t = await getTranslations('Actions')
  const session = await verifyTenantSession()
  const { customerId: tenantId } = session

  if (cadence !== 'cash' && cadence !== 'installment') return fail(t('common.invalidData'))

  const currency = currencyForLocale(await getLocale())
  const baseUrl  = process.env.SEQUOIA_URL ?? 'http://localhost:3000'
  const back     = '/purchasing/plans'

  try {
    const checkout = await openPartnerCheckout({
      tenantId,
      planId,
      cadence,
      currency,
      origin:     CHECKOUT_ORIGINS.seq,
      successUrl: `${baseUrl}${back}?status=success`,
      cancelUrl:  `${baseUrl}${back}?status=cancel`,
    })
    return ok({ url: checkout.url })
  } catch (err) {
    if (err instanceof PartnerCheckoutError) {
      if (err.reason === 'plan-not-found') return fail(t('checkout.packageNotFound'))
      // A plan priced only in dollars is simply not sellable from the
      // Portuguese interface — that is the per-currency book working, not a bug.
      return fail(t('checkout.notSyncedInCurrency', { currency: currencyCode(currency) }))
    }
    console.error('[seq] subscribeToPartnerPlan failed', err)
    return fail(t('checkout.noCheckoutUrl'))
  }
}
