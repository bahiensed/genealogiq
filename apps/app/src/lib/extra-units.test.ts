import { describe, it, expect, vi, beforeEach } from "vitest"
import type Stripe from "stripe"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    extraUnitPurchase: { aggregate: vi.fn(), create: vi.fn() },
  },
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

import { getExtraUnits, applyExtraUnitPurchase } from "./extra-units"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getExtraUnits", () => {
  it("returns the summed quantity for a buyer/resource", async () => {
    prismaMock.extraUnitPurchase.aggregate.mockResolvedValue({ _sum: { quantity: 3 } })

    const result = await getExtraUnits("g1", "GEO_PLACE")

    expect(result).toBe(3)
    expect(prismaMock.extraUnitPurchase.aggregate).toHaveBeenCalledWith({
      where: { buyerId: "g1", resource: "GEO_PLACE" },
      _sum: { quantity: true },
    })
  })

  it("returns 0 when the buyer has never purchased that resource", async () => {
    prismaMock.extraUnitPurchase.aggregate.mockResolvedValue({ _sum: { quantity: null } })

    const result = await getExtraUnits("g1", "QR_CODE")

    expect(result).toBe(0)
  })
})

function makeSession(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return {
    id: "cs_test_123",
    amount_total: 299,
    metadata: { buyerId: "g1", resource: "GEO_PLACE", tier: "FREE", currency: "USD" },
    ...overrides,
  } as Stripe.Checkout.Session
}

describe("applyExtraUnitPurchase", () => {
  it("records a purchase from the checkout session's metadata and amount", async () => {
    prismaMock.extraUnitPurchase.create.mockResolvedValue({})

    await applyExtraUnitPurchase(makeSession())

    expect(prismaMock.extraUnitPurchase.create).toHaveBeenCalledWith({
      data: {
        buyerId: "g1",
        resource: "GEO_PLACE",
        tier: "FREE",
        currency: "USD",
        amountPaid: 2.99,
        stripeSessionId: "cs_test_123",
      },
    })
  })

  it("is a no-op when required metadata is missing", async () => {
    await applyExtraUnitPurchase(makeSession({ metadata: { buyerId: "g1" } }))

    expect(prismaMock.extraUnitPurchase.create).not.toHaveBeenCalled()
  })

  it("swallows a duplicate-delivery error (P2002) instead of throwing", async () => {
    prismaMock.extraUnitPurchase.create.mockRejectedValue({ code: "P2002" })

    await expect(applyExtraUnitPurchase(makeSession())).resolves.toBeUndefined()
  })

  it("re-throws any other error", async () => {
    prismaMock.extraUnitPurchase.create.mockRejectedValue(new Error("db down"))

    await expect(applyExtraUnitPurchase(makeSession())).rejects.toThrow("db down")
  })
})
