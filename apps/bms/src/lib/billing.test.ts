import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, txMock } = vi.hoisted(() => ({
  prismaMock: { sale: { findUnique: vi.fn(), update: vi.fn() }, $transaction: vi.fn() },
  txMock:     { sale: { update: vi.fn() }, genCode: { createMany: vi.fn() } },
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/gen-code", () => ({ generateGenCode: () => "GQL7K2P9MNRX4FT2" }))

import { applySalePayment, markSaleUnpayable } from "./billing"

const session = {
  id: "cs_1", payment_intent: "pi_1",
  amount_subtotal: 5998, amount_total: 5398, currency: "usd",
} as never

const pending = {
  id: 7, paidAt: null, quantity: 2, packageId: "p1", tenantId: "t1",
  package: { quantity: 3 },
}

beforeEach(() => {
  vi.clearAllMocks()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismaMock.$transaction.mockImplementation(async (cb: any) => cb(txMock))
})

describe("applySalePayment", () => {
  it("throws when no sale matches the session", async () => {
    prismaMock.sale.findUnique.mockResolvedValue(null)
    await expect(applySalePayment(session)).rejects.toThrow(/No sale for checkout session/)
  })

  // The inverse of SEQ, where the webhook CREATES the sale so the
  // stripeSessionId unique makes a replay idempotent. Here the row exists before
  // any payment, so the unique would say "already settled" about a sale nobody
  // has paid for. paidAt is the only honest guard.
  it("is idempotent on paidAt: a replay settles nothing twice", async () => {
    prismaMock.sale.findUnique.mockResolvedValue({ ...pending, paidAt: new Date() })

    await applySalePayment(session)

    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it("marks paid, snapshots what Stripe charged, and mints pkg.quantity × quantity codes", async () => {
    prismaMock.sale.findUnique.mockResolvedValue(pending)

    await applySalePayment(session)

    const data = txMock.sale.update.mock.calls[0][0].data
    expect(data.paidAt).toBeInstanceOf(Date)
    expect(data.amountSubtotal).toBe(5998)
    expect(data.amountTotal).toBe(5398)
    expect(data.currency).toBe("usd")
    expect(data.stripePaymentIntentId).toBe("pi_1")

    const arg = txMock.genCode.createMany.mock.calls[0][0] as { data: unknown[] }
    expect(arg.data).toHaveLength(6) // 3 × 2
  })

  // An async payment can fail and then succeed on a retry against the same
  // session; the row must not keep reading as dead once the money is in.
  it("clears expiredAt and failedAt when payment lands", async () => {
    prismaMock.sale.findUnique.mockResolvedValue(pending)

    await applySalePayment(session)

    const data = txMock.sale.update.mock.calls[0][0].data
    expect(data.expiredAt).toBeNull()
    expect(data.failedAt).toBeNull()
  })
})

describe("markSaleUnpayable", () => {
  it("records expiry and failure in separate columns", async () => {
    prismaMock.sale.findUnique.mockResolvedValue({ id: 7, paidAt: null })
    await markSaleUnpayable("cs_1", "expired")
    expect(prismaMock.sale.update.mock.calls[0][0].data).toEqual({ expiredAt: expect.any(Date) })

    vi.clearAllMocks()
    prismaMock.sale.findUnique.mockResolvedValue({ id: 7, paidAt: null })
    await markSaleUnpayable("cs_1", "failed")
    expect(prismaMock.sale.update.mock.calls[0][0].data).toEqual({ failedAt: expect.any(Date) })
  })

  // Stripe can deliver an expiry for a session that settled moments earlier.
  it("never touches a sale that is already paid", async () => {
    prismaMock.sale.findUnique.mockResolvedValue({ id: 7, paidAt: new Date() })
    await markSaleUnpayable("cs_1", "expired")
    expect(prismaMock.sale.update).not.toHaveBeenCalled()
  })

  it("is silent when no sale matches (a session from another app)", async () => {
    prismaMock.sale.findUnique.mockResolvedValue(null)
    await expect(markSaleUnpayable("cs_x", "expired")).resolves.toBeUndefined()
    expect(prismaMock.sale.update).not.toHaveBeenCalled()
  })
})
