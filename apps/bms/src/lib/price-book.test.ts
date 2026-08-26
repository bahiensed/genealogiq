import { describe, it, expect } from 'vitest'
import { decidePriceOp, type PriceAmounts } from './price-book'

const amounts = (over: Partial<PriceAmounts> = {}): PriceAmounts => ({
  annualCashAmount:    2990,
  installmentCount:    12,
  installmentAmount:   299,
  unitReferenceAmount: 29.9,
  ...over,
})

const live = (over: Partial<PriceAmounts> = {}, version = 1) => ({ ...amounts(over), version })

describe('decidePriceOp', () => {
  it('is absent when the currency is in neither the book nor the form', () => {
    expect(decidePriceOp(undefined, null)).toEqual({ kind: 'absent' })
  })

  it('opens a row for a currency newly priced', () => {
    expect(decidePriceOp(undefined, amounts())).toEqual({ kind: 'open' })
  })

  it('closes a row for a currency dropped from the book', () => {
    expect(decidePriceOp(live(), null)).toEqual({ kind: 'close' })
  })

  it('keeps an identical row — an edit that changes nothing must not churn Stripe ids', () => {
    expect(decidePriceOp(live(), amounts())).toEqual({ kind: 'keep' })
  })

  // The rule the whole versioned book exists for.
  it('supersedes when the cash amount changes, bumping the version', () => {
    expect(decidePriceOp(live(), amounts({ annualCashAmount: 3290 })))
      .toEqual({ kind: 'supersede', nextVersion: 2 })
  })

  it('supersedes when only the instalment amount changes', () => {
    expect(decidePriceOp(live(), amounts({ installmentAmount: 329 })))
      .toEqual({ kind: 'supersede', nextVersion: 2 })
  })

  it('supersedes when only the instalment count changes', () => {
    expect(decidePriceOp(live(), amounts({ installmentCount: 6 })))
      .toEqual({ kind: 'supersede', nextVersion: 2 })
  })

  // Cosmetic on its own, but it is the number quoted to the partner in §4.1,
  // and a contract has to be able to resolve the one it was sold under.
  it('supersedes when only the published per-activation figure changes', () => {
    expect(decidePriceOp(live(), amounts({ unitReferenceAmount: 27.5 })))
      .toEqual({ kind: 'supersede', nextVersion: 2 })
  })

  it('counts from the live row, not from one — version 4 supersedes into 5', () => {
    expect(decidePriceOp(live({}, 4), amounts({ annualCashAmount: 1 })))
      .toEqual({ kind: 'supersede', nextVersion: 5 })
  })

  // A currency input cannot hold null, so "no instalments" reaches the action
  // as zero. Treating those as different would supersede on every save.
  it('treats null and zero as the same absence of instalments', () => {
    const existing = live({ installmentCount: null, installmentAmount: null })
    const wanted   = amounts({ installmentCount: 0, installmentAmount: 0 })
    expect(decidePriceOp(existing, wanted)).toEqual({ kind: 'keep' })
  })

  it('supersedes when instalments are actually added to a cash-only price', () => {
    const existing = live({ installmentCount: null, installmentAmount: null })
    const wanted   = amounts({ installmentCount: 12, installmentAmount: 299 })
    expect(decidePriceOp(existing, wanted)).toEqual({ kind: 'supersede', nextVersion: 2 })
  })
})
