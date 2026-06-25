import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { package: { findUnique: vi.fn() } },
}))

vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/dal", () => ({ verifyTenantSession: vi.fn() }))
vi.mock("@/lib/stripe", () => ({
  stripe: { checkout: { sessions: { create: vi.fn() } } },
}))
vi.mock("@/lib/billing", () => ({ ensureTenantStripeCustomer: vi.fn() }))

import { createPackageCheckoutSession } from "./checkout.actions"
import { verifyTenantSession } from "@/lib/dal"
import { stripe } from "@/lib/stripe"
import { ensureTenantStripeCustomer } from "@/lib/billing"

const createSession = vi.mocked(stripe.checkout.sessions.create)

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyTenantSession).mockResolvedValue({
    customerId: "tenant-1",
    user: { id: "seller-1" },
  } as never)
  vi.mocked(ensureTenantStripeCustomer).mockResolvedValue("cus_123")
})

describe("createPackageCheckoutSession", () => {
  it.each([
    ["zero", 0],
    ["negative", -1],
    ["fractional", 1.5],
    ["NaN", Number.NaN],
  ])("rejects a %s quantity before touching the DB", async (_label, qty) => {
    const res = await createPackageCheckoutSession("pkg-1", qty as number)

    expect(res).toEqual({ ok: false, message: "checkout.invalidQuantity" })
    expect(prismaMock.package.findUnique).not.toHaveBeenCalled()
    expect(createSession).not.toHaveBeenCalled()
  })

  it("fails when the package is not found (or inactive)", async () => {
    prismaMock.package.findUnique.mockResolvedValue(null)

    const res = await createPackageCheckoutSession("pkg-missing", 1)

    expect(res).toEqual({ ok: false, message: "checkout.packageNotFound" })
    expect(prismaMock.package.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "pkg-missing", isActive: true } }),
    )
    expect(ensureTenantStripeCustomer).not.toHaveBeenCalled()
    expect(createSession).not.toHaveBeenCalled()
  })

  it("guards against a package not synced to Stripe (missing stripePriceId)", async () => {
    prismaMock.package.findUnique.mockResolvedValue({
      id: "pkg-1",
      type: "DIGITAL",
      stripePriceId: null,
    })

    const res = await createPackageCheckoutSession("pkg-1", 1)

    expect(res).toEqual({ ok: false, message: "checkout.notSynced" })
    expect(ensureTenantStripeCustomer).not.toHaveBeenCalled()
    expect(createSession).not.toHaveBeenCalled()
  })

  it("fails when Stripe returns a session without a url", async () => {
    prismaMock.package.findUnique.mockResolvedValue({
      id: "pkg-1",
      type: "DIGITAL",
      stripePriceId: "price_abc",
    })
    createSession.mockResolvedValue({ url: null } as never)

    const res = await createPackageCheckoutSession("pkg-1", 1)

    expect(res).toEqual({ ok: false, message: "checkout.noCheckoutUrl" })
  })

  it("returns ok({ url }) on the success path and forwards the tenant-scoped line item", async () => {
    prismaMock.package.findUnique.mockResolvedValue({
      id: "pkg-1",
      type: "PHYSICAL",
      stripePriceId: "price_abc",
    })
    createSession.mockResolvedValue({ url: "https://checkout.stripe.com/c/pay/abc" } as never)

    const res = await createPackageCheckoutSession("pkg-1", 3)

    expect(res.ok).toBe(true)
    if (!res.ok) throw new Error("expected ok result")
    expect(res.data?.url).toBe("https://checkout.stripe.com/c/pay/abc")

    expect(ensureTenantStripeCustomer).toHaveBeenCalledWith("tenant-1")
    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        customer: "cus_123",
        client_reference_id: "tenant-1",
        line_items: [{ price: "price_abc", quantity: 3 }],
        metadata: expect.objectContaining({
          tenantId: "tenant-1",
          packageId: "pkg-1",
          quantity: "3",
          soldById: "seller-1",
        }),
      }),
    )
    // PHYSICAL package routes the buyer back to the physical-qr return path.
    const arg = createSession.mock.calls[0]?.[0]
    expect(arg?.success_url).toContain("/purchasing/physical-qr")
  })
})
