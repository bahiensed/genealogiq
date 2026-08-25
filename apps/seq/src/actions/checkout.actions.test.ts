import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, createSession, ensureCustomerMock } = vi.hoisted(() => ({
  prismaMock: {
    package: { findUnique: vi.fn() },
    sale:    { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
  createSession: vi.fn(),
  ensureCustomerMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/stripe", () => ({ stripe: { checkout: { sessions: { create: createSession } } } }))
vi.mock("@/lib/dal", () => ({ verifyTenantSession: vi.fn() }))
vi.mock("@/lib/billing", () => ({ ensureTenantStripeCustomer: ensureCustomerMock }))
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
  getLocale: vi.fn(async () => "en-US"),
}))

import { createPackageCheckoutSession } from "./checkout.actions"
import { verifyTenantSession } from "@/lib/dal"

const PKG = {
  id: "pkg-1", name: "GenCode", termLength: 12,
  stripeAnnualPriceIdUsd: "price_annual", stripeAnnualPriceIdBrl: null, stripeAnnualPriceIdMxn: null,
  stripeMonthlyPriceIdUsd: "price_monthly", stripeMonthlyPriceIdBrl: null, stripeMonthlyPriceIdMxn: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "error").mockImplementation(() => {})
  vi.mocked(verifyTenantSession).mockResolvedValue({
    customerId: "tenant-1", user: { id: "user-1" },
  } as never)
  prismaMock.package.findUnique.mockResolvedValue(PKG)
  prismaMock.sale.create.mockResolvedValue({ id: 42 })
  prismaMock.sale.update.mockResolvedValue({})
  prismaMock.sale.delete.mockResolvedValue({})
  ensureCustomerMock.mockResolvedValue("cus_1")
  createSession.mockResolvedValue({
    id: "cs_1", url: "https://checkout.stripe.com/cs_1",
    amount_subtotal: 2999, amount_total: 2999, currency: "usd",
  })
})

describe("createPackageCheckoutSession", () => {
  it("rejects a non-integer quantity before touching anything", async () => {
    const res = await createPackageCheckoutSession("pkg-1", 0, "annual")
    expect(res).toEqual({ ok: false, message: "checkout.invalidQuantity" })
    expect(prismaMock.package.findUnique).not.toHaveBeenCalled()
  })

  it("fails when the package is not found or inactive", async () => {
    prismaMock.package.findUnique.mockResolvedValue(null)
    const res = await createPackageCheckoutSession("pkg-1", 1, "annual")
    expect(res).toEqual({ ok: false, message: "checkout.packageNotFound" })
  })

  // A product priced only in dollars is not sellable from a Portuguese
  // interface; refusing here beats a Stripe error at the till.
  it("refuses a cadence the product has no synced price for", async () => {
    prismaMock.package.findUnique.mockResolvedValue({ ...PKG, stripeMonthlyPriceIdUsd: null })

    const res = await createPackageCheckoutSession("pkg-1", 1, "monthly")

    expect(res.ok).toBe(false)
    expect(createSession).not.toHaveBeenCalled()
  })

  it("charges the instalment price on monthly and the annual one otherwise", async () => {
    await createPackageCheckoutSession("pkg-1", 3, "annual")
    expect(createSession.mock.calls[0][0].line_items[0].price).toBe("price_annual")

    createSession.mockClear()
    await createPackageCheckoutSession("pkg-1", 3, "monthly")
    expect(createSession.mock.calls[0][0].line_items[0].price).toBe("price_monthly")
  })

  // The origin marker is what makes exactly one of the three webhooks act on an
  // event Stripe delivers to all of them.
  it("stamps seq as the origin, on the subscription and not just the session", async () => {
    await createPackageCheckoutSession("pkg-1", 3, "annual")

    const arg = createSession.mock.calls[0][0]
    expect(arg.mode).toBe("subscription")
    expect(arg.metadata).toMatchObject({ origin: "seq", saleId: "42", tenantId: "tenant-1" })
    expect(arg.subscription_data.metadata).toMatchObject({
      origin: "seq", saleId: "42", cadence: "annual", termLength: "12",
    })
  })

  // Written before the session exists so the webhook has a row to find, exactly
  // as BMS does — and minting nothing until the money arrives.
  it("creates the sale unpaid and mints no codes", async () => {
    await createPackageCheckoutSession("pkg-1", 3, "annual")

    expect(prismaMock.sale.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          packageId: "pkg-1", tenantId: "tenant-1", quantity: 3,
          soldById: "user-1", cadence: "annual",
        }),
      }),
    )
    expect(prismaMock.sale.create.mock.calls[0][0].data.paidAt).toBeUndefined()
  })

  it("stores the session on the sale and returns the url", async () => {
    const res = await createPackageCheckoutSession("pkg-1", 3, "annual")

    expect(prismaMock.sale.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 42 },
        data: expect.objectContaining({ stripeSessionId: "cs_1", checkoutUrl: "https://checkout.stripe.com/cs_1" }),
      }),
    )
    expect(res).toEqual({ ok: true, data: { url: "https://checkout.stripe.com/cs_1" } })
  })

  // An order with no session is one nobody can pay and nobody can see the state
  // of; it must not linger as a permanent "awaiting payment".
  it("deletes the sale when Stripe fails", async () => {
    createSession.mockRejectedValue(new Error("stripe down"))

    const res = await createPackageCheckoutSession("pkg-1", 3, "annual")

    expect(prismaMock.sale.delete).toHaveBeenCalledWith({ where: { id: 42 } })
    expect(res.ok).toBe(false)
  })

  it("deletes the sale when Stripe returns a session with no url", async () => {
    createSession.mockResolvedValue({ id: "cs_1", url: null })

    const res = await createPackageCheckoutSession("pkg-1", 3, "annual")

    expect(prismaMock.sale.delete).toHaveBeenCalledWith({ where: { id: 42 } })
    expect(res).toEqual({ ok: false, message: "checkout.noCheckoutUrl" })
  })
})
