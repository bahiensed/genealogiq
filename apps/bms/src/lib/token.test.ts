import { describe, it, expect } from "vitest"
import { hashToken } from "./token"

// Pinned vector: hashToken MUST produce the same digest in every app, otherwise
// cross-app tokens (e.g. SEQ welcome -> APP reset) would never match. If this
// fails, an app's hashToken diverged from the others — do NOT "fix" by changing
// the expected value; align the implementations instead.
const VECTOR = "genealogiq-test-vector"
const EXPECTED = "7ee33569868114c4bb5b88f3fe3f14e822d4fe68e29c28c9f8d68e2adb00c866"

describe("hashToken", () => {
  it("matches the pinned cross-app vector (SHA-256 hex)", () => {
    expect(hashToken(VECTOR)).toBe(EXPECTED)
  })

  it("is deterministic", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"))
  })

  it("differs for different inputs", () => {
    expect(hashToken("abc")).not.toBe(hashToken("abd"))
  })

  it("returns a 64-char hex string", () => {
    expect(hashToken("anything")).toMatch(/^[0-9a-f]{64}$/)
  })
})
