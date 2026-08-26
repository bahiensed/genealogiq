import { describe, it, expect, vi } from 'vitest'
vi.mock('server-only', () => ({}))

import { decideRollover } from './rollover'

const base = { renewedAllowance: 100, rolloverRate: 0.3, founderEligible: false, founderUsed: false }

describe('decideRollover', () => {
  // The four worked examples from the founder's spec, §6.
  it.each([
    [10, 10], // 90 activated → all 10 carry
    [25, 25], // 75 activated → all 25 carry
    [50, 30], // 50 activated → capped at 30
    [90, 30], // 10 activated → capped at 30
  ])('carries %i unused as %i under the standard rule', (unused, expected) => {
    expect(decideRollover({ ...base, unused }).quantity).toBe(expected)
  })

  it('carries nothing when nothing is left', () => {
    expect(decideRollover({ ...base, unused: 0 }).quantity).toBe(0)
  })

  it('floors the cap to whole units', () => {
    // 0.3 x 250 = 75.0 exactly; 0.3 x 205 = 61.5 must not become 62.
    expect(decideRollover({ ...base, unused: 999, renewedAllowance: 205 }).quantity).toBe(61)
  })

  // Downgrading must shrink what carries over, or a partner rides a big plan's
  // leftovers at a small plan's price.
  it('caps against the RENEWED plan, not the one being left', () => {
    expect(decideRollover({ ...base, unused: 90, renewedAllowance: 100 }).quantity).toBe(30)
    expect(decideRollover({ ...base, unused: 90, renewedAllowance: 400 }).quantity).toBe(90)
  })

  describe('founder guarantee', () => {
    it('carries everything, once, valid to the end of the next cycle', () => {
      const d = decideRollover({ ...base, unused: 60, founderEligible: true })
      expect(d).toEqual({ quantity: 60, usedFounder: true, validity: 'cycle-end' })
    })

    // The spec's own follow-up example: the same partner, one cycle later.
    it('falls back to the standard cap once it has been used', () => {
      const d = decideRollover({ ...base, unused: 60, founderEligible: true, founderUsed: true })
      expect(d).toEqual({ quantity: 30, usedFounder: false, validity: 'months' })
    })

    it('does not apply to a partner who is not in the programme', () => {
      expect(decideRollover({ ...base, unused: 60 }).quantity).toBe(30)
    })
  })
})
