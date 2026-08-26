import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    appUser:         { findUnique: vi.fn() },
    appUserGuardian: { findMany: vi.fn() },
    appSale:         { findMany: vi.fn(), findFirst: vi.fn() },
    subscription:    { findUnique: vi.fn() },
    // Plan prices moved out of the Subscription row into the versioned book;
    // the tier tie-break now ranks by the USD amount found there.
    planPrice:       { findMany: vi.fn() },
  },
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
// getMemorialFeatures is wrapped in React's cache(); outside a request scope
// that memoises per module instance, so every test resets modules to get a
// fresh cache rather than leaking one profile's result into the next.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>()
  return { ...actual, cache: <T,>(fn: T) => fn }
})

import { getMemorialFeatures, isSaleLive } from "./subscription"

const FREE    = { code: "FREE",    memorialsMax: 1, geoPlacesMax: 3,  qrCodeMax: 1 }
const PREMIUM = { code: "PREMIUM", memorialsMax: 5, geoPlacesMax: 6,  qrCodeMax: 1 }

const future = new Date(Date.now() + 86_400_000)
const past   = new Date(Date.now() - 86_400_000)

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.subscription.findUnique.mockResolvedValue(FREE)
  prismaMock.appUserGuardian.findMany.mockResolvedValue([])
  prismaMock.appSale.findMany.mockResolvedValue([])
  prismaMock.planPrice.findMany.mockResolvedValue([])
  prismaMock.appSale.findFirst.mockResolvedValue(null)
})

describe("isSaleLive", () => {
  it("is live only while an active/trialing sale is inside its period", () => {
    expect(isSaleLive({ status: "active",   currentPeriodEnd: future })).toBe(true)
    expect(isSaleLive({ status: "trialing", currentPeriodEnd: future })).toBe(true)
    expect(isSaleLive({ status: "active",   currentPeriodEnd: past })).toBe(false)
    expect(isSaleLive({ status: "canceled", currentPeriodEnd: future })).toBe(false)
    expect(isSaleLive(null)).toBe(false)
    expect(isSaleLive(undefined)).toBe(false)
  })
})

describe("getMemorialFeatures — a redeemed GenCode grants no tier of its own", () => {
  // This is the contract that replaced the hardcoded PHYSICAL_QR ceiling. A
  // physical plaque delivers a memorial; it does NOT come with a plan. The
  // plan is sold separately in the APP, so a fresh guardian stays FREE.
  //
  // The mocked row carries `genCode` on purpose even though the
  // query no longer selects it: that is exactly what the removed
  // short-circuit keyed on, so these two tests fail against the old
  // behaviour (they would resolve to the PHYSICAL_QR constant) and pass
  // against the new one.
  const LICENSED_MEMO = {
    role:              "APP_MEMO",
    genCode: { id: "lic-1" },
    appSale:           null,
  }

  it("resolves a licensed memorial to FREE when its guardian has no paid sale", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue(LICENSED_MEMO)
    prismaMock.appUserGuardian.findMany.mockResolvedValue([{ guardianId: "g1" }])

    await expect(getMemorialFeatures("memo-1")).resolves.toEqual(FREE)
  })

  it("still cascades a paying guardian's plan down to their licensed memorial", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue(LICENSED_MEMO)
    prismaMock.appUserGuardian.findMany.mockResolvedValue([{ guardianId: "g1" }])
    prismaMock.appSale.findMany.mockResolvedValue([
      { subscriptionId: "s-premium", subscription: PREMIUM },
    ])
    prismaMock.planPrice.findMany.mockResolvedValue([
      { subscriptionId: "s-premium", annualCashAmount: 29.9 },
    ])

    await expect(getMemorialFeatures("memo-1")).resolves.toMatchObject({ code: "PREMIUM" })
  })
})

describe("getMemorialFeatures — plan resolution", () => {
  it("gives a living profile its own live paid plan", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue({ role: "APP_USER", appSale: null })
    prismaMock.appSale.findFirst.mockResolvedValue({ subscription: PREMIUM })

    await expect(getMemorialFeatures("g1")).resolves.toEqual(PREMIUM)
  })

  it("falls back to FREE for a living profile with no live sale", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue({ role: "APP_USER", appSale: null })

    await expect(getMemorialFeatures("g1")).resolves.toEqual(FREE)
  })

  // A memorial used to be able to carry its own directly-assigned AppSale from
  // the bulk-slot model. That binding is gone, so a memorial's plan comes from
  // its guardians or from FREE — never from a sale of its own. Mocking one and
  // asserting it is ignored is what stops the branch coming back.
  it("ignores any sale attached to the memorial itself", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue({
      role:    "APP_MEMO",
      appSale: { status: "active", currentPeriodEnd: future, subscription: PREMIUM },
    })

    await expect(getMemorialFeatures("memo-1")).resolves.toEqual(FREE)
  })

  it("picks the richest plan when co-guardians are on different tiers", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue({ role: "APP_MEMO", appSale: null })
    prismaMock.appUserGuardian.findMany.mockResolvedValue([
      { guardianId: "g1" }, { guardianId: "g2" },
    ])
    prismaMock.appSale.findMany.mockResolvedValue([
      { subscriptionId: "s-free",    subscription: FREE },
      { subscriptionId: "s-premium", subscription: PREMIUM },
    ])
    // FREE carries no price-book row at all, which is exactly why the lookup
    // falls back to 0 rather than assuming every plan has a price.
    prismaMock.planPrice.findMany.mockResolvedValue([
      { subscriptionId: "s-premium", annualCashAmount: 29.9 },
    ])

    await expect(getMemorialFeatures("memo-1")).resolves.toMatchObject({ code: "PREMIUM" })
  })

  it("throws when the FREE row is missing — it is the mandatory floor", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue({ role: "APP_USER", appSale: null })
    prismaMock.subscription.findUnique.mockResolvedValue(null)

    await expect(getMemorialFeatures("g1")).rejects.toThrow("FREE subscription row not found")
  })
})
