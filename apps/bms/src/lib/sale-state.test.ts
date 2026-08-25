import { describe, it, expect } from "vitest"
import { saleState, isSaleDimmed, type SaleTimestamps } from "./sale-state"

const NONE: SaleTimestamps = { paidAt: null, expiredAt: null, failedAt: null, reversedAt: null }
const D = new Date()

describe("saleState — precedence", () => {
  it("a sale with nothing stamped is awaiting payment", () => {
    expect(saleState(NONE)).toBe("awaiting")
  })

  it("reversed wins over everything", () => {
    expect(saleState({ paidAt: D, expiredAt: D, failedAt: D, reversedAt: D })).toBe("reversed")
  })

  // Stripe can deliver an expiry for a session that settled moments earlier, and
  // an async payment can fail and then succeed on a retry against the same
  // session. In both cases the money is in and the row must not read as dead.
  it("paid beats both dead-link states", () => {
    expect(saleState({ ...NONE, paidAt: D, expiredAt: D })).toBe("paid")
    expect(saleState({ ...NONE, paidAt: D, failedAt: D })).toBe("paid")
  })

  // A bounced boleto is a more specific fact than a session running out of time,
  // and it points the operator at a different follow-up.
  it("failed beats expired", () => {
    expect(saleState({ ...NONE, failedAt: D, expiredAt: D })).toBe("failed")
  })
})

describe("isSaleDimmed", () => {
  // Deliberately not the negation of paid: an unpaid sale is the most actionable
  // row on the page and must not be greyed out with the dead ones.
  it("does NOT dim a sale awaiting payment", () => {
    expect(isSaleDimmed(NONE)).toBe(false)
  })

  it("does not dim a paid sale", () => {
    expect(isSaleDimmed({ ...NONE, paidAt: D })).toBe(false)
  })

  it("dims reversed, expired and failed", () => {
    expect(isSaleDimmed({ ...NONE, reversedAt: D })).toBe(true)
    expect(isSaleDimmed({ ...NONE, expiredAt: D })).toBe(true)
    expect(isSaleDimmed({ ...NONE, failedAt: D })).toBe(true)
  })
})
