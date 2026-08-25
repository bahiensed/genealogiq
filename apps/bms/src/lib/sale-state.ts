/**
 * The one place that decides what a sale IS.
 *
 * Sale carries four independent nullable timestamps rather than a status column,
 * matching how the rest of this schema records lifecycle. That makes precedence
 * a real decision rather than an enum lookup, and the order below is the whole
 * of it:
 *
 * - `reversed` wins over everything. An operator reversed it; how it was paid
 *   stopped mattering.
 * - `paid` beats both dead-link states. Stripe can deliver an expiry for a
 *   session that settled moments earlier, and an async payment can fail and then
 *   succeed on a retry against the same session — in both cases the money is in
 *   and the row must not read as dead.
 * - `failed` before `expired`: a bounced boleto is a more specific fact than a
 *   session running out of time, and it points at a different follow-up.
 * - otherwise the link is live and nobody has paid yet.
 */
export type SaleState = 'reversed' | 'paid' | 'failed' | 'expired' | 'awaiting'

export interface SaleTimestamps {
  paidAt:     Date | null
  expiredAt:  Date | null
  failedAt:   Date | null
  reversedAt: Date | null
}

export function saleState(sale: SaleTimestamps): SaleState {
  if (sale.reversedAt) return 'reversed'
  if (sale.paidAt)     return 'paid'
  if (sale.failedAt)   return 'failed'
  if (sale.expiredAt)  return 'expired'
  return 'awaiting'
}

/**
 * Whether the row should read as spent. Deliberately NOT the negation of
 * `paid`: a sale awaiting payment is the most actionable row on the page and
 * must not be greyed out with the dead ones.
 */
export function isSaleDimmed(sale: SaleTimestamps): boolean {
  const state = saleState(sale)
  return state === 'reversed' || state === 'expired' || state === 'failed'
}
