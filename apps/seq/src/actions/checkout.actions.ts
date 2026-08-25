'use server'

import { getTranslations } from 'next-intl/server'
import { fail, type ActionResult } from '@genealogiq/core'
import { verifyTenantSession } from '@/lib/dal'

/**
 * Self-serve GenCode purchase — paused.
 *
 * GenCode products became subscriptions: annual renews yearly, monthly ends
 * after its term. Their Stripe Prices now carry a `recurring` block, and Stripe
 * refuses a recurring Price in a `mode: 'payment'` session — which is all this
 * ever created.
 *
 * Reopening it means giving the tenant a cadence to choose and a subscription
 * webhook to settle it, the same pair BMS just grew. Until then this fails with
 * a message a funeral-home employee can act on, rather than a raw Stripe error
 * at the till, and GenealogiQ can still sell to them by payment link.
 *
 * The session guard stays: an unauthenticated caller gets 403, not an
 * explanation of a feature they cannot reach.
 */
export async function createPackageCheckoutSession(
  _packageId: string,
  _quantity:  number,
): Promise<ActionResult<{ url: string }>> {
  await verifyTenantSession()
  const t = await getTranslations('Actions')

  return fail(t('checkout.selfServePaused'))
}
