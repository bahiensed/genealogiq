import { describe, it, expect, vi, beforeEach } from "vitest"

// Prisma + stripe mocks must be hoisted so they exist when the vi.mock factories run.
const { prismaMock, stripeMock } = vi.hoisted(() => ({
  prismaMock: {
    subscription: { findUnique: vi.fn() },
    appSale: { findFirst: vi.fn() },
  },
  stripeMock: {
    checkout: { sessions: { create: vi.fn() } },
    subscriptions: { retrieve: vi.fn(), update: vi.fn() },
    subscriptionSchedules: { create: vi.fn(), update: vi.fn() },
    billingPortal: { sessions: { create: vi.fn() } },
  },
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
// Echo the key so assertions pin the exact message source (namespace "Actions").
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }))
// All these tests exercise the USD path — locale resolution itself is covered elsewhere.
vi.mock("@genealogiq/i18n/server", () => ({ resolveLocale: vi.fn().mockResolvedValue("en-US") }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/stripe", () => ({ stripe: stripeMock }))
vi.mock("@/lib/dal", () => ({ verifySession: vi.fn() }))
// compareTier is a pure helper — keep the real upgrade/downgrade math; stub the I/O ones.
vi.mock("@/lib/billing", () => ({
  ensureStripeCustomer: vi.fn(),
  upsertSaleFromSubscription: vi.fn(),
  compareTier: (a: { price: number; termLength: number }, b: { price: number; termLength: number }) =>
    a.price / Math.max(a.termLength, 1) - b.price / Math.max(b.termLength, 1),
}))

import { createCheckoutSession, changeSubscription } from "./billing.actions"
import { verifySession } from "@/lib/dal"
import { ensureStripeCustomer, upsertSaleFromSubscription } from "@/lib/billing"

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifySession).mockResolvedValue({ user: { id: "user-1" } } as never)
  vi.mocked(ensureStripeCustomer).mockResolvedValue("cus_123")
})

describe("createCheckoutSession", () => {
  it("fails with planNotFound when no active plan matches (never touches Stripe)", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(null)

    const res = await createCheckoutSession("sub-x", "monthly")

    expect(res).toEqual({ ok: false, message: "billing.planNotFound" })
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled()
  })

  it("fails with planNotWiredSeed when the selected cadence has no Stripe priceId", async () => {
    // Plan exists but the requested cadence (annual) was never wired to a Stripe price.
    prismaMock.subscription.findUnique.mockResolvedValue({
      id: "sub-1",
      name: "Pro",
      priceBrl: null,
      priceMxn: null,
      stripeAnnualPriceIdUsd: null,
      stripeMonthlyPriceIdUsd: "price_monthly",
    })

    const res = await createCheckoutSession("sub-1", "annual")

    expect(res).toEqual({ ok: false, message: "billing.planNotWiredSeed" })
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled()
  })

  it("returns ok({ url }) on the happy path", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({
      id: "sub-1",
      name: "Pro",
      priceBrl: null,
      priceMxn: null,
      stripeAnnualPriceIdUsd: "price_annual",
      stripeMonthlyPriceIdUsd: "price_monthly",
    })
    stripeMock.checkout.sessions.create.mockResolvedValue({ url: "https://checkout.stripe.test/abc" })

    const res = await createCheckoutSession("sub-1", "monthly")

    expect(res.ok).toBe(true)
    expect(res.ok && res.data).toEqual({ url: "https://checkout.stripe.test/abc" })
    // Uses the monthly price for cadence "monthly".
    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        customer: "cus_123",
        line_items: [{ price: "price_monthly", quantity: 1 }],
      }),
    )
  })

  it("fails with noCheckoutUrl when Stripe returns a session without a url", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({
      id: "sub-1",
      name: "Pro",
      priceBrl: null,
      priceMxn: null,
      stripeAnnualPriceIdUsd: "price_annual",
      stripeMonthlyPriceIdUsd: "price_monthly",
    })
    stripeMock.checkout.sessions.create.mockResolvedValue({ url: null })

    const res = await createCheckoutSession("sub-1", "monthly")

    expect(res).toEqual({ ok: false, message: "billing.noCheckoutUrl" })
  })
})

describe("changeSubscription", () => {
  it("fails with noActiveSubscription when the caller has no active sale", async () => {
    prismaMock.appSale.findFirst.mockResolvedValue(null)

    const res = await changeSubscription("sub-2", "monthly")

    expect(res).toEqual({ ok: false, message: "billing.noActiveSubscription" })
    expect(prismaMock.subscription.findUnique).not.toHaveBeenCalled()
  })

  it("fails with planNotWired when the target cadence has no Stripe priceId", async () => {
    prismaMock.appSale.findFirst.mockResolvedValue({
      stripeSubscriptionId: "stripe_sub_1",
      currency: "USD",
      subscription: { priceUsd: 10, termLength: 1 },
    })
    prismaMock.subscription.findUnique.mockResolvedValue({
      id: "sub-2",
      priceUsd: 20,
      priceBrl: null,
      priceMxn: null,
      termLength: 1,
      stripeAnnualPriceIdUsd: null, // requested cadence "annual" not wired
      stripeMonthlyPriceIdUsd: "price_monthly",
    })

    const res = await changeSubscription("sub-2", "annual")

    expect(res).toEqual({ ok: false, message: "billing.planNotWired" })
  })

  it("upgrade: swaps the price immediately and returns ok({ effect: 'upgraded' })", async () => {
    prismaMock.appSale.findFirst.mockResolvedValue({
      stripeSubscriptionId: "stripe_sub_1",
      currency: "USD",
      subscription: { priceUsd: 10, termLength: 1 }, // cheaper current plan
    })
    prismaMock.subscription.findUnique.mockResolvedValue({
      id: "sub-2",
      priceUsd: 20, // pricier target → compareTier >= 0 → immediate upgrade branch
      priceBrl: null,
      priceMxn: null,
      termLength: 1,
      stripeAnnualPriceIdUsd: "price_annual",
      stripeMonthlyPriceIdUsd: "price_monthly",
    })
    stripeMock.subscriptions.retrieve.mockResolvedValue({ items: { data: [{ id: "si_1" }] } })
    stripeMock.subscriptions.update.mockResolvedValue({ id: "stripe_sub_1" })

    const res = await changeSubscription("sub-2", "monthly")

    expect(res.ok).toBe(true)
    expect(res.ok && res.data).toEqual({ effect: "upgraded" })
    expect(stripeMock.subscriptions.update).toHaveBeenCalledWith(
      "stripe_sub_1",
      expect.objectContaining({ items: [{ id: "si_1", price: "price_monthly" }] }),
    )
    // DB is mirrored immediately so the page refresh shows the new plan.
    expect(upsertSaleFromSubscription).toHaveBeenCalled()
  })

  it("downgrade: schedules the switch and returns ok({ effect: 'scheduled' })", async () => {
    prismaMock.appSale.findFirst.mockResolvedValue({
      stripeSubscriptionId: "stripe_sub_1",
      currency: "USD",
      subscription: { priceUsd: 30, termLength: 1 }, // pricier current plan
    })
    prismaMock.subscription.findUnique.mockResolvedValue({
      id: "sub-2",
      priceUsd: 10, // cheaper target → compareTier < 0 → deferred downgrade branch
      priceBrl: null,
      priceMxn: null,
      termLength: 1,
      stripeAnnualPriceIdUsd: "price_annual",
      stripeMonthlyPriceIdUsd: "price_monthly",
    })
    stripeMock.subscriptionSchedules.create.mockResolvedValue({
      id: "sched_1",
      phases: [{ items: [{ price: "price_old", quantity: 1 }], start_date: 100, end_date: 200, metadata: {} }],
    })
    stripeMock.subscriptionSchedules.update.mockResolvedValue({})

    const res = await changeSubscription("sub-2", "monthly")

    expect(res.ok).toBe(true)
    expect(res.ok && res.data).toEqual({ effect: "scheduled" })
    expect(stripeMock.subscriptions.update).not.toHaveBeenCalled()
    expect(upsertSaleFromSubscription).not.toHaveBeenCalled()
  })

  it("returns a failure carrying the Stripe error message when the Stripe call throws", async () => {
    prismaMock.appSale.findFirst.mockResolvedValue({
      stripeSubscriptionId: "stripe_sub_1",
      currency: "USD",
      subscription: { priceUsd: 10, termLength: 1 },
    })
    prismaMock.subscription.findUnique.mockResolvedValue({
      id: "sub-2",
      priceUsd: 20,
      priceBrl: null,
      priceMxn: null,
      termLength: 1,
      stripeAnnualPriceIdUsd: "price_annual",
      stripeMonthlyPriceIdUsd: "price_monthly",
    })
    stripeMock.subscriptions.retrieve.mockRejectedValue(new Error("stripe is down"))

    const res = await changeSubscription("sub-2", "monthly")

    expect(res).toEqual({ ok: false, message: "stripe is down" })
  })
})
