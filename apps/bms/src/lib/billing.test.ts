import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, txMock, emailMock, stripeMock } = vi.hoisted(() => ({
  prismaMock: {
    sale: { findUnique: vi.fn(), update: vi.fn() },
    user: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
  txMock: {
    sale:               { update: vi.fn() },
    genCode:            { createMany: vi.fn() },
    user:               { update: vi.fn() },
    passwordResetToken: { deleteMany: vi.fn(), create: vi.fn() },
  },
  emailMock: vi.fn(),
  stripeMock: { subscriptions: { update: vi.fn() } },
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/gen-code", () => ({ generateGenCode: () => "GQL7K2P9MNRX4FT2" }))
vi.mock("@/lib/email", () => ({ sendSequoiaWelcomeEmail: emailMock }))
vi.mock("@/lib/stripe", () => ({ stripe: stripeMock }))
vi.mock("@genealogiq/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@genealogiq/core")>()),
  hashToken: (t: string) => `hashed:${t}`,
}))

import { applySalePayment, markSaleUnpayable, settleSaleManually, provisionTenantAccess, applySubscriptionToSale } from "./billing"

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
  // Default: the owner is already active, so provisioning is a no-op and the
  // payment tests stay about payment.
  prismaMock.user.findFirst.mockResolvedValue({ id: "u1", email: "o@x.com", isActive: true })
  emailMock.mockResolvedValue(undefined)
  stripeMock.subscriptions.update.mockResolvedValue({})
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

describe("provisionTenantAccess", () => {
  // createCustomer writes the owner inactive with no token and no email; this is
  // the other half, and it runs on EVERY payment. A tenant buying a second time
  // must not have their password reset out from under them.
  it("is a no-op when the owner is already active", async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: "u1", email: "o@x.com", isActive: true })

    await provisionTenantAccess("t1")

    expect(prismaMock.$transaction).not.toHaveBeenCalled()
    expect(emailMock).not.toHaveBeenCalled()
  })

  it("activates the owner, mints a fresh token and sends the welcome", async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: "u1", email: "o@x.com", isActive: false })

    await provisionTenantAccess("t1")

    expect(txMock.user.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { isActive: true } })
    // Old tokens go first: a second provisioning must not leave two live links.
    expect(txMock.passwordResetToken.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1" } })
    expect(txMock.passwordResetToken.create).toHaveBeenCalledTimes(1)
    expect(emailMock).toHaveBeenCalledTimes(1)
  })

  // The money is in and the codes are minted by the time this runs. Throwing
  // would make the webhook retry a fulfilment that already succeeded.
  it("does not throw when the tenant has no owner row", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null)
    await expect(provisionTenantAccess("t1")).resolves.toBeUndefined()
    expect(emailMock).not.toHaveBeenCalled()
  })
})

describe("settleSaleManually", () => {
  // Deliberately the same fulfilment as the webhook, so the two ways money can
  // arrive cannot drift into two different outcomes.
  it("mints the same codes as a Stripe payment and stamps who vouched for it", async () => {
    prismaMock.sale.findUnique.mockResolvedValue(pending)

    await settleSaleManually(7, "admin-1")

    const data = txMock.sale.update.mock.calls[0][0].data
    expect(data.paidAt).toBeInstanceOf(Date)
    expect(data.paidById).toBe("admin-1")
    const arg = txMock.genCode.createMany.mock.calls[0][0] as { data: unknown[] }
    expect(arg.data).toHaveLength(6) // 3 × 2, same as the webhook path
  })

  it("refuses to settle a sale twice", async () => {
    prismaMock.sale.findUnique.mockResolvedValue({ ...pending, paidAt: new Date() })

    await settleSaleManually(7, "admin-1")

    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })
})

describe("applySalePayment — Sequoia access", () => {
  // paidById distinguishes the two: Stripe-settled sales leave it null.
  it("leaves paidById null and opens Sequoia", async () => {
    prismaMock.sale.findUnique.mockResolvedValue(pending)
    prismaMock.user.findFirst.mockResolvedValue({ id: "u1", email: "o@x.com", isActive: false })

    await applySalePayment(session)

    expect(txMock.sale.update.mock.calls[0][0].data.paidById).toBeUndefined()
    expect(emailMock).toHaveBeenCalledTimes(1)
  })
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

describe("applySubscriptionToSale", () => {
  it("ignores a subscription that is not ours", async () => {
    await applySubscriptionToSale(sub({ metadata: { saleId: "7" } }))
    expect(prismaMock.sale.findUnique).not.toHaveBeenCalled()
  })

  // customer.subscription.created arrives before the first invoice is paid.
  // Minting there would hand over a whole batch for nothing.
  it("does NOT mint on an incomplete subscription, but does record its status", async () => {
    prismaMock.sale.findUnique.mockResolvedValue(pending)

    await applySubscriptionToSale(sub({ status: "incomplete" }))

    expect(txMock.genCode.createMany).not.toHaveBeenCalled()
    const data = txMock.sale.update.mock.calls[0][0].data
    expect(data.status).toBe("incomplete")
    expect(data.paidAt).toBeUndefined()
  })

  it("mints once the subscription reports a paying status, and opens Sequoia", async () => {
    prismaMock.sale.findUnique.mockResolvedValue(pending)
    prismaMock.user.findFirst.mockResolvedValue({ id: "u1", email: "o@x.com", isActive: false })

    await applySubscriptionToSale(sub())

    const arg = txMock.genCode.createMany.mock.calls[0][0] as { data: unknown[] }
    expect(arg.data).toHaveLength(6) // 3 × 2
    expect(txMock.sale.update.mock.calls[0][0].data.paidAt).toBeInstanceOf(Date)
    expect(emailMock).toHaveBeenCalledTimes(1)
  })

  // Every renewal re-enters this path. A second batch would double the stock
  // the tenant paid for once.
  it("never mints twice — a renewal only moves the window", async () => {
    prismaMock.sale.findUnique.mockResolvedValue({ ...pending, paidAt: new Date() })

    await applySubscriptionToSale(sub())

    expect(txMock.genCode.createMany).not.toHaveBeenCalled()
    expect(txMock.sale.update.mock.calls[0][0].data.accessEndsAt).toBeInstanceOf(Date)
  })

  // The freeze: status is stored raw and the window closes as a consequence of
  // reading it, with nothing to sweep.
  it("records a lapsed status without touching the codes", async () => {
    prismaMock.sale.findUnique.mockResolvedValue({ ...pending, paidAt: new Date() })

    await applySubscriptionToSale(sub({ status: "past_due" }))

    expect(txMock.sale.update.mock.calls[0][0].data.status).toBe("past_due")
    expect(txMock.genCode.createMany).not.toHaveBeenCalled()
  })

  // Stripe has no "charge N times and stop", so the end is a cancel_at set once.
  it("schedules the end of a monthly plan, once", async () => {
    prismaMock.sale.findUnique.mockResolvedValue(pending)

    await applySubscriptionToSale(sub({ metadata: { origin: "bms", saleId: "7", cadence: "monthly", termLength: "12" } }))

    expect(stripeMock.subscriptions.update).toHaveBeenCalledWith("sub_1", { cancel_at: expect.any(Number) })
  })

  it("does not schedule an end for an annual plan, which renews", async () => {
    prismaMock.sale.findUnique.mockResolvedValue(pending)

    await applySubscriptionToSale(sub())

    expect(stripeMock.subscriptions.update).not.toHaveBeenCalled()
  })

  it("does not re-schedule an end that is already set", async () => {
    prismaMock.sale.findUnique.mockResolvedValue(pending)

    await applySubscriptionToSale(sub({
      cancel_at: Math.floor(Date.now() / 1000) + 100,
      metadata: { origin: "bms", saleId: "7", cadence: "monthly", termLength: "12" },
    }))

    expect(stripeMock.subscriptions.update).not.toHaveBeenCalled()
  })
})
