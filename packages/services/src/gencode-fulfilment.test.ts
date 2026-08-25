import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, txMock, stripeMock } = vi.hoisted(() => ({
  prismaMock: { sale: { findUnique: vi.fn(), update: vi.fn() }, $transaction: vi.fn() },
  txMock:     { sale: { update: vi.fn() }, genCode: { createMany: vi.fn() } },
  stripeMock: { subscriptions: { update: vi.fn() } },
}))

vi.mock("@genealogiq/db", () => ({ prisma: prismaMock }))
vi.mock("./stripe", () => ({ stripe: stripeMock }))
vi.mock("server-only", () => ({}))

import { applyGenCodeSubscription } from "./gencode-fulfilment"

const pending = {
  id: 7, paidAt: null, quantity: 2, packageId: "p1", tenantId: "t1",
  package: { quantity: 3 },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "error").mockImplementation(() => {})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismaMock.$transaction.mockImplementation(async (cb: any) => cb(txMock))
  stripeMock.subscriptions.update.mockResolvedValue({})
})

const sub = (over: Record<string, unknown> = {}) => ({
  id: "sub_1",
  status: "active",
  start_date: Math.floor(Date.now() / 1000),
  cancel_at: null,
  metadata: { origin: "bms", saleId: "7", cadence: "annual", termLength: "12" },
  items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + 86_400 * 365,
                    price: { currency: "usd", unit_amount: 2999 } }] },
  ...over,
}) as never

describe("applyGenCodeSubscription", () => {
  it("ignores a subscription that is not ours", async () => {
    await applyGenCodeSubscription(sub({ metadata: { saleId: "7" } }), "bms")
    expect(prismaMock.sale.findUnique).not.toHaveBeenCalled()
  })

  // customer.subscription.created arrives before the first invoice is paid.
  // Minting there would hand over a whole batch for nothing.
  it("does NOT mint on an incomplete subscription, but does record its status", async () => {
    prismaMock.sale.findUnique.mockResolvedValue(pending)

    await applyGenCodeSubscription(sub({ status: "incomplete" }), "bms")

    expect(txMock.genCode.createMany).not.toHaveBeenCalled()
    const data = txMock.sale.update.mock.calls[0][0].data
    expect(data.status).toBe("incomplete")
    expect(data.paidAt).toBeUndefined()
  })

  it("mints once the subscription reports a paying status", async () => {
    prismaMock.sale.findUnique.mockResolvedValue(pending)

    await applyGenCodeSubscription(sub(), "bms")

    const arg = txMock.genCode.createMany.mock.calls[0][0] as { data: unknown[] }
    expect(arg.data).toHaveLength(6) // 3 × 2
    expect(txMock.sale.update.mock.calls[0][0].data.paidAt).toBeInstanceOf(Date)
  })

  // Every renewal re-enters this path. A second batch would double the stock
  // the tenant paid for once.
  it("never mints twice — a renewal only moves the window", async () => {
    prismaMock.sale.findUnique.mockResolvedValue({ ...pending, paidAt: new Date() })

    await applyGenCodeSubscription(sub(), "bms")

    expect(txMock.genCode.createMany).not.toHaveBeenCalled()
    expect(txMock.sale.update.mock.calls[0][0].data.accessEndsAt).toBeInstanceOf(Date)
  })

  // The freeze: status is stored raw and the window closes as a consequence of
  // reading it, with nothing to sweep.
  it("records a lapsed status without touching the codes", async () => {
    prismaMock.sale.findUnique.mockResolvedValue({ ...pending, paidAt: new Date() })

    await applyGenCodeSubscription(sub({ status: "past_due" }), "bms")

    expect(txMock.sale.update.mock.calls[0][0].data.status).toBe("past_due")
    expect(txMock.genCode.createMany).not.toHaveBeenCalled()
  })

  // Stripe has no "charge N times and stop", so the end is a cancel_at set once.
  it("schedules the end of a monthly plan, once", async () => {
    prismaMock.sale.findUnique.mockResolvedValue(pending)

    await applyGenCodeSubscription(sub({ metadata: { origin: "bms", saleId: "7", cadence: "monthly", termLength: "12" } }), "bms")

    expect(stripeMock.subscriptions.update).toHaveBeenCalledWith("sub_1", { cancel_at: expect.any(Number) })
  })

  it("does not schedule an end for an annual plan, which renews", async () => {
    prismaMock.sale.findUnique.mockResolvedValue(pending)

    await applyGenCodeSubscription(sub(), "bms")

    expect(stripeMock.subscriptions.update).not.toHaveBeenCalled()
  })

  it("does not re-schedule an end that is already set", async () => {
    prismaMock.sale.findUnique.mockResolvedValue(pending)

    await applyGenCodeSubscription(sub({
      cancel_at: Math.floor(Date.now() / 1000) + 100,
      metadata: { origin: "bms", saleId: "7", cadence: "monthly", termLength: "12" },
    }), "bms")

    expect(stripeMock.subscriptions.update).not.toHaveBeenCalled()
  })
})
