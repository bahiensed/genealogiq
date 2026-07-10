import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, webpushMock, FakeWebPushError } = vi.hoisted(() => {
  // web-push's error class — mimic enough shape for instanceof checks. Lives
  // inside vi.hoisted so the vi.mock factory (hoisted to the top) can see it.
  class FakeWebPushError extends Error {
    statusCode: number
    constructor(statusCode: number) {
      super(`push failed ${statusCode}`)
      this.statusCode = statusCode
    }
  }
  return {
    FakeWebPushError,
    prismaMock: {
      appUser: { findUnique: vi.fn() },
      tribute: { findUnique: vi.fn() },
      appUserGuardian: { findUnique: vi.fn() },
      pushSubscription: { delete: vi.fn() },
    },
    webpushMock: {
      setVapidDetails: vi.fn(),
      sendNotification: vi.fn(),
    },
  }
})

vi.mock("web-push", () => ({
  default: webpushMock,
  WebPushError: FakeWebPushError,
}))
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

import { sendPushForNotification } from "./push"

const SUB = { id: "sub-1", endpoint: "https://push.example/1", p256dh: "k1", auth: "a1" }

function stubEnv() {
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "pub")
  vi.stubEnv("VAPID_PRIVATE_KEY", "priv")
  vi.stubEnv("VAPID_SUBJECT", "mailto:test@genealogiq.app")
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  stubEnv()
  prismaMock.appUser.findUnique.mockResolvedValue({
    preferredLocale: "pt-BR",
    pushSubscriptions: [SUB],
  })
  prismaMock.pushSubscription.delete.mockResolvedValue({})
  webpushMock.sendNotification.mockResolvedValue({})
})

describe("sendPushForNotification", () => {
  it("sends one push per subscription with a localized payload", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue({
      preferredLocale: "pt-BR",
      pushSubscriptions: [SUB, { ...SUB, id: "sub-2", endpoint: "https://push.example/2" }],
    })

    await sendPushForNotification({ type: "FAMILY_REQUEST_PENDING", userId: "u1" })

    expect(webpushMock.sendNotification).toHaveBeenCalledTimes(2)
    const [subscription, payload, options] = webpushMock.sendNotification.mock.calls[0]
    expect(subscription).toEqual({
      endpoint: SUB.endpoint,
      keys: { p256dh: SUB.p256dh, auth: SUB.auth },
    })
    const parsed = JSON.parse(payload)
    expect(parsed.title).toBe("Convite para a árvore")
    expect(parsed.url).toBe("/messages")
    expect(options).toMatchObject({ TTL: 86400, urgency: "normal" })
  })

  it("no-ops without VAPID env vars", async () => {
    vi.unstubAllEnvs()
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "")

    await sendPushForNotification({ type: "TRIBUTE_PENDING", userId: "u1" })

    expect(prismaMock.appUser.findUnique).not.toHaveBeenCalled()
    expect(webpushMock.sendNotification).not.toHaveBeenCalled()
  })

  it("no-ops when the recipient has no subscriptions", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue({
      preferredLocale: null,
      pushSubscriptions: [],
    })

    await sendPushForNotification({ type: "TRIBUTE_PENDING", userId: "u1" })

    expect(webpushMock.sendNotification).not.toHaveBeenCalled()
  })

  it("deletes the subscription when the endpoint is gone (410)", async () => {
    webpushMock.sendNotification.mockRejectedValue(new FakeWebPushError(410))

    await sendPushForNotification({ type: "TRIBUTE_PENDING", userId: "u1" })

    expect(prismaMock.pushSubscription.delete).toHaveBeenCalledWith({
      where: { id: SUB.id },
    })
  })

  it("keeps the subscription and swallows transient errors (500)", async () => {
    webpushMock.sendNotification.mockRejectedValue(new FakeWebPushError(500))

    await expect(
      sendPushForNotification({ type: "TRIBUTE_PENDING", userId: "u1" })
    ).resolves.toBeUndefined()

    expect(prismaMock.pushSubscription.delete).not.toHaveBeenCalled()
  })

  it("deep-links tribute results to the profile's tributes page", async () => {
    prismaMock.tribute.findUnique.mockResolvedValue({ profileId: "prof-9" })

    await sendPushForNotification({
      type: "TRIBUTE_APPROVED",
      userId: "u1",
      tributeId: "trib-1",
    })

    const [, payload] = webpushMock.sendNotification.mock.calls[0]
    expect(JSON.parse(payload).url).toBe("/profile/prof-9/tributes")
  })

  it("deep-links guardian acceptance to the co-managed profile", async () => {
    prismaMock.appUserGuardian.findUnique.mockResolvedValue({ appUserId: "prof-3" })

    await sendPushForNotification({
      type: "GUARDIAN_REQUEST_ACCEPTED",
      userId: "u1",
      appUserGuardianId: "g-1",
    })

    const [, payload] = webpushMock.sendNotification.mock.calls[0]
    expect(JSON.parse(payload).url).toBe("/profile/prof-3")
  })

  it("never throws even when the recipient query fails", async () => {
    prismaMock.appUser.findUnique.mockRejectedValue(new Error("db down"))

    await expect(
      sendPushForNotification({ type: "TRIBUTE_PENDING", userId: "u1" })
    ).resolves.toBeUndefined()
  })
})
