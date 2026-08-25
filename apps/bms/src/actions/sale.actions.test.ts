import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, stripeMock, emailMock, ensureCustomerMock, settleMock, PrismaKnownError } = vi.hoisted(() => {
  class PrismaKnownError extends Error {
    code: string
    constructor(message: string, code: string) {
      super(message)
      this.code = code
    }
  }
  const prismaMock = {
    package:        { findUnique: vi.fn() },
    tenant:         { findUnique: vi.fn() },
    discountCoupon: { findFirst: vi.fn() },
    sale:           { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    genCode:        { createMany: vi.fn(), deleteMany: vi.fn() },
    $transaction:   vi.fn((cb: (tx: unknown) => Promise<unknown>) => cb(prismaMock)),
  }
  return {
    prismaMock,
    stripeMock: { checkout: { sessions: { create: vi.fn(), expire: vi.fn() } } },
    emailMock: vi.fn(),
    ensureCustomerMock: vi.fn(),
    settleMock: vi.fn(),
    PrismaKnownError,
  }
})

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@genealogiq/db", () => ({ Prisma: { PrismaClientKnownRequestError: PrismaKnownError } }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/stripe", () => ({ stripe: stripeMock }))
vi.mock("@/lib/dal", () => ({ verifyAdmin: vi.fn(), requireRole: vi.fn() }))
vi.mock("@/lib/email", () => ({ sendSalePaymentLinkEmail: emailMock }))
vi.mock("@/lib/billing", () => ({ BMS_ORIGIN: "bms", settleSaleManually: settleMock }))
vi.mock("@genealogiq/services/stripe-customer", () => ({ ensureTenantStripeCustomer: ensureCustomerMock }))
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
  // The locale picks the currency, so every action that touches money reads it.
  getLocale: vi.fn(async () => "en-US"),
}))

import { createSalePaymentLink, reverseSale, markSalePaidManually, resendSaleCharge } from "./sale.actions"
import { verifyAdmin, requireRole } from "@/lib/dal"

const input = { packageId: "p1", tenantId: "c1", quantity: 2, discountCouponId: "" }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyAdmin).mockResolvedValue({ user: { id: "admin-1" } } as never)
  vi.mocked(requireRole).mockResolvedValue({ user: { id: "admin-1", role: "OWNER" } } as never)
  settleMock.mockResolvedValue(undefined)
  prismaMock.package.findUnique.mockResolvedValue({
    isActive: true, stripeAnnualPriceIdUsd: "price_1", stripeAnnualPriceIdBrl: null, stripeAnnualPriceIdMxn: null,
  })
  prismaMock.tenant.findUnique.mockResolvedValue({ isActive: true })
  prismaMock.sale.create.mockResolvedValue({ id: 99 })
  prismaMock.sale.update.mockResolvedValue({})
  // openCheckoutForSale re-reads the row it is opening a session for.
  prismaMock.sale.findUnique.mockResolvedValue({
    quantity: 2, tenantId: "c1", packageId: "p1", discountCouponId: null, soldById: "admin-1",
    package: {
      name: "GenCode",
      priceUsd: 29.99, priceBrl: null, priceMxn: null,
      stripeAnnualPriceIdUsd: "price_1", stripeAnnualPriceIdBrl: null, stripeAnnualPriceIdMxn: null,
    },
    tenant: { email: "funeraria@example.com", name: "Funerária X", tradeName: "X" },
  })
  prismaMock.sale.delete.mockResolvedValue({})
  ensureCustomerMock.mockResolvedValue("cus_1")
  stripeMock.checkout.sessions.create.mockResolvedValue({
    id: "cs_1", url: "https://checkout.stripe.com/cs_1",
    amount_subtotal: 5998, amount_total: 5998, currency: "usd",
  })
  emailMock.mockResolvedValue(undefined)
  stripeMock.checkout.sessions.expire.mockResolvedValue({})
  process.env.BMS_URL = "https://bms.example.com"
})

describe("createSalePaymentLink — guards", () => {
  it("rejects invalid input before touching the DB", async () => {
    const res = await createSalePaymentLink({ packageId: "", tenantId: "", quantity: 0 } as never)
    expect(res).toEqual({ ok: false, message: "common.invalidData" })
    expect(prismaMock.package.findUnique).not.toHaveBeenCalled()
  })

  // A quantity cap is a typo guard, not a business rule: 50000 would mint half a
  // million GenCode rows AND charge for them.
  it("rejects a quantity above the cap", async () => {
    const res = await createSalePaymentLink({ ...input, quantity: 5000 })
    expect(res).toEqual({ ok: false, message: "common.invalidData" })
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled()
  })

  // Without a synced Price there is nothing to charge for. Before payment links
  // this could not bite, because no money ever changed hands.
  it("refuses a product with no Stripe price", async () => {
    prismaMock.package.findUnique.mockResolvedValue({
      isActive: true, stripeAnnualPriceIdUsd: null, stripeAnnualPriceIdBrl: null, stripeAnnualPriceIdMxn: null,
    })
    const res = await createSalePaymentLink(input)
    expect(res).toEqual({ ok: false, message: "sale.packageNotSyncedInCurrency" })
    expect(prismaMock.sale.create).not.toHaveBeenCalled()
  })

  it("refuses an inactive customer", async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({ isActive: false })
    expect(await createSalePaymentLink(input)).toEqual({ ok: false, message: "sale.tenantInactive" })
  })

  // The select is a convenience; a page left open can offer a coupon that has
  // since expired or been restricted away from this product.
  it("re-resolves the coupon server-side and refuses one that no longer applies", async () => {
    prismaMock.discountCoupon.findFirst.mockResolvedValue(null)
    const res = await createSalePaymentLink({ ...input, discountCouponId: "coupon-1" })
    expect(res).toEqual({ ok: false, message: "sale.couponNotApplicable" })
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled()
  })
})

describe("createSalePaymentLink — the session", () => {
  it("creates the sale unpaid and mints NO GenCodes", async () => {
    await createSalePaymentLink(input)

    expect(prismaMock.sale.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ packageId: "p1", tenantId: "c1", quantity: 2, soldById: "admin-1" }),
      }),
    )
    const created = prismaMock.sale.create.mock.calls[0][0].data
    expect(created.paidAt).toBeUndefined()
    // Codes are what payment buys. A link nobody pays must leave nothing behind.
    expect(prismaMock.genCode.createMany).not.toHaveBeenCalled()
  })

  it("stamps origin and saleId so both webhooks can tell whose session it is", async () => {
    await createSalePaymentLink(input)

    const arg = stripeMock.checkout.sessions.create.mock.calls[0][0]
    expect(arg.metadata).toMatchObject({ origin: "bms", saleId: "99", tenantId: "c1", packageId: "p1" })
    expect(arg.payment_intent_data.metadata).toMatchObject({ origin: "bms", saleId: "99" })
  })

  // `discounts` and `allow_promotion_codes` are mutually exclusive in the Stripe
  // API — sending both is a 400.
  it("allows the buyer to type a code when no coupon was chosen", async () => {
    await createSalePaymentLink(input)

    const arg = stripeMock.checkout.sessions.create.mock.calls[0][0]
    expect(arg.allow_promotion_codes).toBe(true)
    expect(arg.discounts).toBeUndefined()
  })

  it("applies the chosen coupon and does NOT also allow promotion codes", async () => {
    prismaMock.discountCoupon.findFirst.mockResolvedValue({ id: "coupon-1", stripePromotionCodeId: "promo_1" })
    // The coupon reaches Stripe through the sale row, not a local variable —
    // which is what lets a resend re-resolve it later instead of carrying a
    // stale promotion code forward.
    prismaMock.sale.findUnique.mockResolvedValue({
      quantity: 2, tenantId: "c1", packageId: "p1", discountCouponId: "coupon-1", soldById: "admin-1",
      package: {
        name: "GenCode",
        priceUsd: 29.99, priceBrl: null, priceMxn: null,
        stripeAnnualPriceIdUsd: "price_1", stripeAnnualPriceIdBrl: null, stripeAnnualPriceIdMxn: null,
      },
      tenant: { email: "funeraria@example.com", name: "Funerária X", tradeName: "X" },
    })

    await createSalePaymentLink({ ...input, discountCouponId: "coupon-1" })

    const arg = stripeMock.checkout.sessions.create.mock.calls[0][0]
    expect(arg.discounts).toEqual([{ promotion_code: "promo_1" }])
    expect(arg.allow_promotion_codes).toBeUndefined()
  })

  it("stores the session id and url on the sale, and emails the tenant", async () => {
    const res = await createSalePaymentLink(input)

    expect(prismaMock.sale.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 99 },
        data: expect.objectContaining({
          stripeSessionId: "cs_1",
          checkoutUrl:     "https://checkout.stripe.com/cs_1",
          amountTotal:     5998,
        }),
      }),
    )
    expect(emailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "funeraria@example.com", url: "https://checkout.stripe.com/cs_1" }),
    )
    expect(res.ok).toBe(true)
  })

  // A sale with no link is an order nobody can pay and nobody can see the state
  // of — it must not linger as a permanent "awaiting payment".
  it("deletes the sale when Stripe fails", async () => {
    stripeMock.checkout.sessions.create.mockRejectedValue(new Error("card_declined"))

    const res = await createSalePaymentLink(input)

    expect(prismaMock.sale.delete).toHaveBeenCalledWith({ where: { id: 99 } })
    expect(res.ok).toBe(false)
  })

  it("deletes the sale when the email fails, rather than leaving a link nobody received", async () => {
    emailMock.mockRejectedValue(new Error("resend down"))

    const res = await createSalePaymentLink(input)

    expect(prismaMock.sale.delete).toHaveBeenCalledWith({ where: { id: 99 } })
    expect(res.ok).toBe(false)
  })
})

describe("reverseSale", () => {
  it("rejects when the sale does not exist", async () => {
    prismaMock.sale.findUnique.mockResolvedValue(null)
    expect(await reverseSale(1)).toEqual({ ok: false, message: "sale.notFound" })
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it("rejects a sale that was already reversed", async () => {
    prismaMock.sale.findUnique.mockResolvedValue({
      quantity: 1, tenantId: "c1", reversedAt: new Date(), package: { quantity: 1 },
    })
    expect(await reverseSale(1)).toEqual({ ok: false, message: "sale.alreadyReversed" })
  })

  it("marks reversed and deletes only AVAILABLE GenCodes", async () => {
    prismaMock.sale.findUnique.mockResolvedValue({
      quantity: 1, tenantId: "c1", reversedAt: null, package: { quantity: 1 },
    })

    const res = await reverseSale(7)

    expect(prismaMock.sale.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 7 }, data: { reversedAt: expect.any(Date) } }),
    )
    expect(prismaMock.genCode.deleteMany).toHaveBeenCalledWith({
      where: { saleId: 7, status: "AVAILABLE" },
    })
    expect(res).toEqual({ ok: true, message: undefined })
  })

  it("maps a P2025 race to 'Sale not found.'", async () => {
    prismaMock.sale.findUnique.mockResolvedValue({
      quantity: 1, tenantId: "c1", reversedAt: null, package: { quantity: 1 },
    })
    prismaMock.sale.update.mockRejectedValue(new PrismaKnownError("gone", "P2025"))
    expect(await reverseSale(7)).toEqual({ ok: false, message: "sale.notFound" })
  })
})

describe("markSalePaidManually", () => {
  // The escape hatch for money that arrived outside Stripe. Gated harder than
  // link generation: an ADMIN may open links all day, but asserting that money
  // arrived when Stripe never saw it is an owner's call.
  it("goes through requireRole, not verifyAdmin", async () => {
    prismaMock.sale.findUnique.mockResolvedValue({ paidAt: null, reversedAt: null })

    await markSalePaidManually(7)

    expect(requireRole).toHaveBeenCalledWith("SUPER_ADMIN", "OWNER")
  })

  it("refuses a sale that is already paid", async () => {
    prismaMock.sale.findUnique.mockResolvedValue({ paidAt: new Date(), reversedAt: null })

    expect(await markSalePaidManually(7)).toEqual({ ok: false, message: "sale.alreadyPaid" })
    expect(settleMock).not.toHaveBeenCalled()
  })

  it("refuses a reversed sale", async () => {
    prismaMock.sale.findUnique.mockResolvedValue({ paidAt: null, reversedAt: new Date() })

    expect(await markSalePaidManually(7)).toEqual({ ok: false, message: "sale.alreadyReversed" })
    expect(settleMock).not.toHaveBeenCalled()
  })

  it("records who vouched for the payment", async () => {
    prismaMock.sale.findUnique.mockResolvedValue({ paidAt: null, reversedAt: null })

    const res = await markSalePaidManually(7)

    expect(settleMock).toHaveBeenCalledWith(7, "admin-1")
    expect(res).toEqual({ ok: true, message: "sale.markedPaid" })
  })
})

const liveSale = {
  paidAt: null, reversedAt: null, expiredAt: null, failedAt: null,
  stripeSessionId: "cs_old", checkoutUrl: "https://checkout.stripe.com/cs_old",
  tenant: { email: "funeraria@example.com" },
  // fields sendSaleLinkAgain reads
  quantity: 2, amountTotal: 5998, currency: "usd",
  package: { name: "GenCode" },
}

describe("resendSaleCharge", () => {
  it("refuses a paid sale", async () => {
    prismaMock.sale.findUnique.mockResolvedValue({ ...liveSale, paidAt: new Date() })
    expect(await resendSaleCharge(7)).toEqual({ ok: false, message: "sale.alreadyPaid" })
  })

  it("refuses a reversed sale", async () => {
    prismaMock.sale.findUnique.mockResolvedValue({ ...liveSale, reversedAt: new Date() })
    expect(await resendSaleCharge(7)).toEqual({ ok: false, message: "sale.alreadyReversed" })
  })

  // A live link is re-sent unchanged. Opening a second session would leave two
  // payable links for one order, and the customer could be charged twice.
  it("re-sends a live link without opening a new session", async () => {
    prismaMock.sale.findUnique.mockResolvedValue(liveSale)

    const res = await resendSaleCharge(7)

    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled()
    expect(stripeMock.checkout.sessions.expire).not.toHaveBeenCalled()
    expect(emailMock).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://checkout.stripe.com/cs_old" }),
    )
    expect(res).toEqual({ ok: true, message: "sale.linkResent" })
  })

  // An unexpired link forgotten in an old email could otherwise be paid after
  // the replacement already was — two charges for one order.
  it("expires the dead session in Stripe before opening a replacement", async () => {
    const order: string[] = []
    stripeMock.checkout.sessions.expire.mockImplementation(async () => { order.push("expire"); return {} })
    stripeMock.checkout.sessions.create.mockImplementation(async () => {
      order.push("create")
      return { id: "cs_new", url: "https://checkout.stripe.com/cs_new",
               amount_subtotal: 5998, amount_total: 5998, currency: "usd" }
    })
    prismaMock.sale.findUnique
      .mockResolvedValueOnce({ ...liveSale, expiredAt: new Date() })
      .mockResolvedValue({
        quantity: 2, tenantId: "c1", packageId: "p1", discountCouponId: null, soldById: "admin-1",
        package: { name: "GenCode", priceUsd: 29.99, priceBrl: null, priceMxn: null,
                   stripeAnnualPriceIdUsd: "price_1", stripeAnnualPriceIdBrl: null, stripeAnnualPriceIdMxn: null },
        tenant: { email: "funeraria@example.com", name: "Funerária X", tradeName: "X" },
      })

    const res = await resendSaleCharge(7)

    expect(order).toEqual(["expire", "create"])
    expect(res).toEqual({ ok: true, message: "sale.linkRegenerated" })
  })

  // Same treatment for a bounced boleto: the session is spent either way.
  it("regenerates after an async payment failure", async () => {
    prismaMock.sale.findUnique
      .mockResolvedValueOnce({ ...liveSale, failedAt: new Date() })
      .mockResolvedValue({
        quantity: 2, tenantId: "c1", packageId: "p1", discountCouponId: null, soldById: "admin-1",
        package: { name: "GenCode", priceUsd: 29.99, priceBrl: null, priceMxn: null,
                   stripeAnnualPriceIdUsd: "price_1", stripeAnnualPriceIdBrl: null, stripeAnnualPriceIdMxn: null },
        tenant: { email: "funeraria@example.com", name: "Funerária X", tradeName: "X" },
      })

    const res = await resendSaleCharge(7)

    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledTimes(1)
    expect(res.ok).toBe(true)
  })

  // A fresh link revives the row — whatever killed the last one no longer holds.
  it("clears expiredAt and failedAt on the new session", async () => {
    prismaMock.sale.findUnique
      .mockResolvedValueOnce({ ...liveSale, expiredAt: new Date() })
      .mockResolvedValue({
        quantity: 2, tenantId: "c1", packageId: "p1", discountCouponId: null, soldById: "admin-1",
        package: { name: "GenCode", priceUsd: 29.99, priceBrl: null, priceMxn: null,
                   stripeAnnualPriceIdUsd: "price_1", stripeAnnualPriceIdBrl: null, stripeAnnualPriceIdMxn: null },
        tenant: { email: "funeraria@example.com", name: "Funerária X", tradeName: "X" },
      })

    await resendSaleCharge(7)

    const data = prismaMock.sale.update.mock.calls.at(-1)![0].data
    expect(data.expiredAt).toBeNull()
    expect(data.failedAt).toBeNull()
  })
})
