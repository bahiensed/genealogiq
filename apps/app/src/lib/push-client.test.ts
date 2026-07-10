import { describe, it, expect } from "vitest"
import {
  PUSH_DISMISS_COOLDOWN_MS,
  isDismissedWithinCooldown,
  urlBase64ToUint8Array,
} from "./push-client"

describe("urlBase64ToUint8Array", () => {
  // A real (test) VAPID public key: 65-byte uncompressed P-256 point, base64url.
  const VAPID_KEY =
    "BM5Zj-9Bq2Yw3xVZDCcO0GJv_wUE0PZplOSjA07M6wG9BArev1rIkkbRXhLmlPPZLAI39GRDIfKMWKfaU7T5Fpc"

  it("decodes a VAPID public key to a 65-byte uncompressed EC point", () => {
    const bytes = urlBase64ToUint8Array(VAPID_KEY)
    expect(bytes.length).toBe(65)
    expect(bytes[0]).toBe(0x04) // uncompressed point marker
  })

  it("handles base64url characters (- and _)", () => {
    // base64url "-_8" = base64 "+/8" → bytes 0xfb 0xff
    const bytes = urlBase64ToUint8Array("-_8")
    expect(Array.from(bytes)).toEqual([0xfb, 0xff])
  })
})

describe("isDismissedWithinCooldown", () => {
  const now = 1_800_000_000_000

  it("is true right after dismissal and false after the 30-day cooldown", () => {
    expect(isDismissedWithinCooldown(String(now - 1000), now)).toBe(true)
    expect(isDismissedWithinCooldown(String(now - PUSH_DISMISS_COOLDOWN_MS), now)).toBe(false)
    expect(isDismissedWithinCooldown(String(now - PUSH_DISMISS_COOLDOWN_MS + 1), now)).toBe(true)
  })

  it("is false for null and malformed values", () => {
    expect(isDismissedWithinCooldown(null, now)).toBe(false)
    expect(isDismissedWithinCooldown("garbage", now)).toBe(false)
  })
})
