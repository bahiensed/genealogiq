import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, txMock, emailMock, stripeMock, applyGenCodeSubscriptionMock } = vi.hoisted(() => ({
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
  applyGenCodeSubscriptionMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/gen-code", () => ({ generateGenCode: () => "GQL7K2P9MNRX4FT2" }))
vi.mock("@/lib/email", () => ({ sendSequoiaWelcomeEmail: emailMock }))
vi.mock("@/lib/stripe", () => ({ stripe: stripeMock }))
vi.mock("@genealogiq/services/gencode-fulfilment", () => ({
  applyGenCodeSubscription: applyGenCodeSubscriptionMock,
  CHECKOUT_ORIGINS: { bms: "bms", seq: "seq" },
}))
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

describe("applySubscriptionToSale — what BMS still owns", () => {
  // The minting moved to @genealogiq/services (SEQ sells the same product and
  // must not get a second chance at the "mint once" rule). What stays here is
  // the step only BMS does: a tenant who bought through a payment link may never
  // have signed in, so the first settled sale is what grants access.
  it("opens Sequoia on the first payment", async () => {
    applyGenCodeSubscriptionMock.mockResolvedValue({ tenantId: "t1", firstPayment: true })
    prismaMock.user.findFirst.mockResolvedValue({ id: "u1", email: "o@x.com", isActive: false })

    await applySubscriptionToSale({ id: "sub_1" } as never)

    expect(emailMock).toHaveBeenCalledTimes(1)
  })

  it("does nothing more on a renewal", async () => {
    applyGenCodeSubscriptionMock.mockResolvedValue({ tenantId: "t1", firstPayment: false })

    await applySubscriptionToSale({ id: "sub_1" } as never)

    expect(prismaMock.user.findFirst).not.toHaveBeenCalled()
    expect(emailMock).not.toHaveBeenCalled()
  })

  it("does nothing when the subscription is not ours", async () => {
    applyGenCodeSubscriptionMock.mockResolvedValue(null)

    await applySubscriptionToSale({ id: "sub_1" } as never)

    expect(emailMock).not.toHaveBeenCalled()
  })
})
