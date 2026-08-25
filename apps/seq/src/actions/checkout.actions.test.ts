import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { package: { findUnique: vi.fn() } },
}))

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
  getLocale: vi.fn(async () => "en-US"),
}))
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

describe("createPackageCheckoutSession — paused", () => {
  // GenCode Prices are recurring now, and Stripe refuses a recurring Price in a
  // mode:'payment' session. Rather than fail at the till, self-serve buying is
  // closed until it can offer a cadence and settle through subscription events.
  it("refuses with an actionable message instead of reaching Stripe", async () => {
    const res = await createPackageCheckoutSession("pkg-1", 1)

    expect(res).toEqual({ ok: false, message: "checkout.selfServePaused" })
    expect(createSession).not.toHaveBeenCalled()
  })

  // The pause is not an open door: an unauthenticated caller still gets the
  // session error, not an explanation of a feature they cannot reach.
  it("still requires a tenant session", async () => {
    vi.mocked(verifyTenantSession).mockRejectedValue(new Error("no session"))

    await expect(createPackageCheckoutSession("pkg-1", 1)).rejects.toThrow("no session")
    expect(createSession).not.toHaveBeenCalled()
  })
})
