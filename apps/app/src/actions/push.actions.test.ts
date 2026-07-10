import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    pushSubscription: { upsert: vi.fn(), deleteMany: vi.fn() },
  },
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/dal", () => ({ verifySession: vi.fn() }))
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ "user-agent": "TestBrowser/1.0" })),
}))
vi.mock("@genealogiq/services/rate-limit", () => ({ checkRateLimit: vi.fn() }))

import { subscribePush, unsubscribePush } from "./push.actions"
import { verifySession } from "@/lib/dal"
import { checkRateLimit } from "@genealogiq/services/rate-limit"

const VALID = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
  keys: { p256dh: "BM5Zj-9Bq2Yw3xVZ", auth: "k8JVsu2Dl3ZZaXKY" },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifySession).mockResolvedValue({ user: { id: "u1" } } as never)
  vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true } as never)
  prismaMock.pushSubscription.upsert.mockResolvedValue({})
  prismaMock.pushSubscription.deleteMany.mockResolvedValue({ count: 1 })
})

describe("subscribePush", () => {
  it("rejects invalid input before touching the DB", async () => {
    const res = await subscribePush({ endpoint: "http://insecure.dev", keys: VALID.keys })

    expect(res.ok).toBe(false)
    expect(prismaMock.pushSubscription.upsert).not.toHaveBeenCalled()
  })

  it("fails when rate limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, retryAfter: 60 } as never)

    const res = await subscribePush(VALID)

    expect(res.ok).toBe(false)
    expect(prismaMock.pushSubscription.upsert).not.toHaveBeenCalled()
  })

  it("upserts by endpoint with userId in create AND update (shared-device reassignment)", async () => {
    const res = await subscribePush(VALID)

    expect(res.ok).toBe(true)
    expect(prismaMock.pushSubscription.upsert).toHaveBeenCalledWith({
      where: { endpoint: VALID.endpoint },
      create: {
        userId: "u1",
        endpoint: VALID.endpoint,
        p256dh: VALID.keys.p256dh,
        auth: VALID.keys.auth,
        userAgent: "TestBrowser/1.0",
      },
      update: {
        userId: "u1",
        p256dh: VALID.keys.p256dh,
        auth: VALID.keys.auth,
        userAgent: "TestBrowser/1.0",
      },
    })
  })
})

describe("unsubscribePush", () => {
  it("deletes by endpoint", async () => {
    const res = await unsubscribePush({ endpoint: VALID.endpoint })

    expect(res.ok).toBe(true)
    expect(prismaMock.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { endpoint: VALID.endpoint },
    })
  })

  it("rejects invalid endpoints without touching the DB", async () => {
    const res = await unsubscribePush({ endpoint: "not-a-url" })

    expect(res.ok).toBe(false)
    expect(prismaMock.pushSubscription.deleteMany).not.toHaveBeenCalled()
  })
})
