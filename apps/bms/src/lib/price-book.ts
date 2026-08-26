/**
 * What editing a plan's price book does to one currency.
 *
 * Pulled out of the action as a pure decision because it is the rule the whole
 * versioned price book rests on, and the way it fails is silent: getting
 * `supersede` wrong looks exactly like `keep` from the outside, right up until
 * someone asks what a contract was actually charged and the answer has been
 * overwritten.
 *
 * The old Package columns had no such rule — a price edit was an UPDATE, so
 * changing an amount rewrote the revenue history of every sale that carried no
 * snapshot. `queries/reports.ts` still documents that scar.
 */

export interface PriceAmounts {
  annualCashAmount:    number
  installmentCount:    number | null
  installmentAmount:   number | null
  unitReferenceAmount: number | null
}

export type PriceOp =
  /** No live row and none wanted — this currency is simply not in the book. */
  | { kind: 'absent' }
  /** Nothing changed; the live row stays exactly as it is, Stripe ids included. */
  | { kind: 'keep' }
  /** Newly priced in this currency. */
  | { kind: 'open' }
  /** Dropped from the book: close the live row, sell nothing here. */
  | { kind: 'close' }
  /** Amount changed: close the live row and open the next version beside it. */
  | { kind: 'supersede'; nextVersion: number }

/** Treats null and 0 alike: a currency form cannot hold null, so "not offered" arrives as zero. */
function same(a: number | null, b: number | null): boolean {
  return (a ?? 0) === (b ?? 0)
}

export function decidePriceOp(
  existing: (PriceAmounts & { version: number }) | undefined,
  wanted:   PriceAmounts | null,
): PriceOp {
  if (!wanted)   return existing ? { kind: 'close' } : { kind: 'absent' }
  if (!existing) return { kind: 'open' }

  const unchanged =
    same(existing.annualCashAmount,    wanted.annualCashAmount) &&
    same(existing.installmentCount,    wanted.installmentCount) &&
    same(existing.installmentAmount,   wanted.installmentAmount) &&
    same(existing.unitReferenceAmount, wanted.unitReferenceAmount)

  return unchanged ? { kind: 'keep' } : { kind: 'supersede', nextVersion: existing.version + 1 }
}
