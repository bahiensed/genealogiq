import { describe, it, expect } from "vitest"
import { exceedsQuota } from "./quota"

describe("exceedsQuota", () => {
  it("allows a write comfortably inside the limit", () => {
    expect(exceedsQuota(100, 2048, 50)).toBe(false)
  })

  it("allows a write that lands exactly on the limit", () => {
    expect(exceedsQuota(2048, 2048, 10)).toBe(false)
  })

  it("refuses growing past the limit from below", () => {
    expect(exceedsQuota(2049, 2048, 2000)).toBe(true)
  })

  // The case the B2C trial creates at scale: a bio written under PREMIUM,
  // now on FREE. Saving the text it already has must not be refused, or the
  // family cannot correct a typo in their own memorial.
  it("allows re-saving content that was already over the limit", () => {
    expect(exceedsQuota(5000, 2048, 5000)).toBe(false)
  })

  it("allows shrinking while still over the limit", () => {
    expect(exceedsQuota(4000, 2048, 5000)).toBe(false)
  })

  it("refuses growing further while already over the limit", () => {
    expect(exceedsQuota(5001, 2048, 5000)).toBe(true)
  })
})
