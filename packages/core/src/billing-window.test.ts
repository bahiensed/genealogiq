import { describe, it, expect } from "vitest"
import { isSaleWindowOpen, isStripeStatusLive, type SaleWindow } from "./billing-window"

const past   = new Date(Date.now() - 60_000)
const future = new Date(Date.now() + 60_000)

const paid: SaleWindow = { paidAt: past, reversedAt: null, status: null, accessEndsAt: null }

describe("isStripeStatusLive", () => {
  it("accepts only the two statuses that mean money is arriving", () => {
    expect(isStripeStatusLive("active")).toBe(true)
    expect(isStripeStatusLive("trialing")).toBe(true)
    for (const dead of ["past_due", "unpaid", "canceled", "incomplete_expired", "paused"]) {
      expect(isStripeStatusLive(dead)).toBe(false)
    }
    expect(isStripeStatusLive(null)).toBe(false)
  })
})

describe("isSaleWindowOpen", () => {
  it("is closed for a sale nobody paid for", () => {
    expect(isSaleWindowOpen({ ...paid, paidAt: null })).toBe(false)
  })

  it("is closed for a reversed sale", () => {
    expect(isSaleWindowOpen({ ...paid, reversedAt: past })).toBe(false)
  })

  it("is closed for nothing at all", () => {
    expect(isSaleWindowOpen(null)).toBe(false)
    expect(isSaleWindowOpen(undefined)).toBe(false)
  })

  // A null accessEndsAt means NO TERM, the opposite of AppSale where a null
  // period end is a defect. This is what keeps a sale written before cadence
  // existed redeemable forever.
  it("is open with no term and no subscription", () => {
    expect(isSaleWindowOpen(paid)).toBe(true)
  })

  it("closes when the term runs out, and not a moment before", () => {
    expect(isSaleWindowOpen({ ...paid, accessEndsAt: future })).toBe(true)
    expect(isSaleWindowOpen({ ...paid, accessEndsAt: past })).toBe(false)
  })

  // The freeze: stock shuts while the funeral home is behind, and reopens by
  // itself when Stripe reports active again. No sweeper, no state to reconcile.
  it("freezes on a lapsed subscription even while the term still runs", () => {
    expect(isSaleWindowOpen({ ...paid, status: "past_due", accessEndsAt: future })).toBe(false)
    expect(isSaleWindowOpen({ ...paid, status: "unpaid",   accessEndsAt: future })).toBe(false)
    expect(isSaleWindowOpen({ ...paid, status: "canceled", accessEndsAt: future })).toBe(false)
  })

  it("reopens the same row once Stripe reports active again", () => {
    const frozen: SaleWindow = { ...paid, status: "past_due", accessEndsAt: future }
    expect(isSaleWindowOpen(frozen)).toBe(false)
    expect(isSaleWindowOpen({ ...frozen, status: "active" })).toBe(true)
  })

  // Both halves have to hold: paying for a term that already ended buys nothing.
  it("stays closed when the subscription is live but the term has passed", () => {
    expect(isSaleWindowOpen({ ...paid, status: "active", accessEndsAt: past })).toBe(false)
  })
})
