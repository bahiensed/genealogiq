/**
 * Whether a write that lands ABOVE a quota should be refused.
 *
 * The rule is "block growth", not "block being over". A profile can end up over
 * its limit without doing anything wrong — the guardian's trial ends, or their
 * subscription lapses, and quotas that were generous yesterday are not today.
 * Nothing deletes the content, so it simply sits there, over the line.
 *
 * Refusing every write in that state means a family with a 5.000-character
 * biography written under PREMIUM drops to FREE and cannot fix a typo, because
 * saving the text they already have is itself "over the limit". The B2C trial
 * manufactures exactly that, at scale, twelve months after launch.
 *
 * So: over the limit is allowed to stay, and allowed to shrink. Only growing
 * further is refused.
 */
export function exceedsQuota(next: number, max: number, current: number): boolean {
  if (next <= max) return false
  // Already over: tolerate anything that does not make it worse.
  return next > current
}
