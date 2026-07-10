import { describe, it, expect } from "vitest"
import { pushSubscribeSchema, pushUnsubscribeSchema } from "./push.schema"

// A realistic PushSubscription.toJSON() shape (keys are base64url).
const VALID = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc123-DEF_456",
  keys: {
    p256dh: "BM5Zj-9Bq2Yw3xVZDCcO0GJv_wUE0PZplOSjA07M6wG9BArev1rIkkbRXhLmlPPZLAI39GRDIfKMWKfaU7T5Fpc",
    auth: "k8JVsu2Dl3ZZaXKYRSTUvw",
  },
}

describe("pushSubscribeSchema", () => {
  it("accepts a valid browser subscription", () => {
    expect(pushSubscribeSchema.safeParse(VALID).success).toBe(true)
  })

  it("rejects non-https endpoints", () => {
    const result = pushSubscribeSchema.safeParse({
      ...VALID,
      endpoint: "http://fcm.googleapis.com/fcm/send/abc",
    })
    expect(result.success).toBe(false)
  })

  it("rejects keys with non-base64url characters", () => {
    const result = pushSubscribeSchema.safeParse({
      ...VALID,
      keys: { ...VALID.keys, p256dh: "invalid+key/with=padding" },
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing keys", () => {
    const result = pushSubscribeSchema.safeParse({ endpoint: VALID.endpoint })
    expect(result.success).toBe(false)
  })

  it("rejects oversized endpoints", () => {
    const result = pushSubscribeSchema.safeParse({
      ...VALID,
      endpoint: "https://x.dev/" + "a".repeat(2048),
    })
    expect(result.success).toBe(false)
  })
})

describe("pushUnsubscribeSchema", () => {
  it("accepts a valid endpoint and rejects http", () => {
    expect(pushUnsubscribeSchema.safeParse({ endpoint: VALID.endpoint }).success).toBe(true)
    expect(pushUnsubscribeSchema.safeParse({ endpoint: "http://x.dev/a" }).success).toBe(false)
  })
})
