/**
 * The statuses Stripe reports for a subscription that is actually paying.
 *
 * Everything else — `past_due`, `unpaid`, `canceled`, `incomplete_expired` —
 * means the money stopped. This list is the single shared fact between the B2C
 * side (AppSale.currentPeriodEnd) and the B2B one (Sale.accessEndsAt); the
 * deadline rule differs between them and deliberately is NOT shared, because a
 * null deadline means opposite things on each.
 */
export const LIVE_STRIPE_STATUSES = ['active', 'trialing'] as const

export function isStripeStatusLive(status: string | null | undefined): boolean {
  return !!status && (LIVE_STRIPE_STATUSES as readonly string[]).includes(status)
}

export interface SaleWindow {
  paidAt:       Date | null
  reversedAt:   Date | null
  /** Raw Stripe subscription status. Null for a sale that never involved one. */
  status:       string | null
  /** End of the period the GenCodes may be activated in. Null = no term. */
  accessEndsAt: Date | null
}

/**
 * Whether a sale's GenCodes may still be activated.
 *
 * This gates ACTIVATION ONLY. A memorial that already redeemed a code keeps it
 * forever — the family bought a physical plaque and it must not go dark because
 * the funeral home fell behind on an instalment. The window governs the
 * tenant's remaining stock, nothing that has already been handed to a consumer.
 *
 * Four ways to be closed, in the order they are cheapest to check:
 *
 * - reversed — the sale was undone
 * - unpaid — no money arrived yet, so nothing was bought
 * - the subscription is not paying. This is the freeze: `past_due` shuts the
 *   stock immediately and reopens it by itself the moment Stripe reports
 *   `active` again, with no sweeper and no state to reconcile
 * - the term ran out
 *
 * A null `accessEndsAt` means no term rather than a broken row — the opposite
 * of AppSale, where a null period end is a defect. That is what keeps a sale
 * made before cadence existed redeemable forever.
 */
export function isSaleWindowOpen(sale: SaleWindow | null | undefined): boolean {
  if (!sale) return false
  if (sale.reversedAt) return false
  if (!sale.paidAt) return false
  if (sale.status !== null && !isStripeStatusLive(sale.status)) return false
  if (sale.accessEndsAt !== null && sale.accessEndsAt <= new Date()) return false
  return true
}
