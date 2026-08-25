import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, FakeDecimal, PrismaKnownError, stripeMock } = vi.hoisted(() => {
  // Minimal stand-in for Prisma.Decimal: enough for `new Prisma.Decimal(x)` + `.equals`.
  class FakeDecimal {
    private readonly s: string
    constructor(value: number | string) {
      this.s = String(value)
    }
    equals(other: FakeDecimal): boolean {
      return this.s === other.s
    }
  }
  class PrismaKnownError extends Error {
    code: string
    constructor(message: string, code: string) {
      super(message)
      this.code = code
    }
  }
  const prismaMock = {
    package: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
  }
  const stripeMock = { prices: { update: vi.fn() } }
  return { prismaMock, FakeDecimal, PrismaKnownError, stripeMock }
})

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
// Identity translator: t('package.created') -> 'package.created', with interpolation appended.
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key
  ),
}))
vi.mock("@genealogiq/db", () => ({
  Prisma: { Decimal: FakeDecimal, PrismaClientKnownRequestError: PrismaKnownError },
}))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/stripe", () => ({ stripe: stripeMock }))
vi.mock("@/lib/dal", () => ({ verifyAdmin: vi.fn() }))

import { createPackage, updatePackage, deletePackage } from "./package.actions"
import { verifyAdmin } from "@/lib/dal"

const validInput = {
  name:            "GenCode",
  quantity:        10,
  description:     "Produto com 10 GenCodes",
  termLength:      12,
  priceUsd:        50,
  monthlyPriceUsd: 0,
  priceBrl:        0,
  monthlyPriceBrl: 0,
  priceMxn:        0,
  monthlyPriceMxn: 0,
  isActive:        true,
}

const noIds = {
  stripeAnnualPriceIdUsd: null, stripeMonthlyPriceIdUsd: null,
  stripeAnnualPriceIdBrl: null, stripeMonthlyPriceIdBrl: null,
  stripeAnnualPriceIdMxn: null, stripeMonthlyPriceIdMxn: null,
}
const noPrices = {
  termLength: 12,
  priceUsd: null, monthlyPriceUsd: null,
  priceBrl: null, monthlyPriceBrl: null,
  priceMxn: null, monthlyPriceMxn: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyAdmin).mockResolvedValue({ user: { id: "admin-1" } } as never)
})

describe("createPackage", () => {
  it("rejects invalid input", async () => {
    const res = await createPackage({ ...validInput, name: "no" } as never)
    expect(res).toEqual({ ok: false, message: "common.invalidData" })
    expect(prismaMock.package.create).not.toHaveBeenCalled()
  })

  // A product nobody can buy in any currency is a draft, not a product.
  it("rejects a product with no price in any currency", async () => {
    const res = await createPackage({ ...validInput, priceUsd: 0, priceBrl: 0, priceMxn: 0 })
    expect(res).toEqual({ ok: false, message: "common.invalidData" })
    expect(prismaMock.package.create).not.toHaveBeenCalled()
  })

  // Zero in the form means "not sold in this currency" — the column must hold
  // null, not 0, or the sellable-in-this-currency filters would match it.
  it("stores priced currencies as Decimal and unpriced ones as null", async () => {
    prismaMock.package.create.mockResolvedValue({ id: "p1" })

    const res = await createPackage({ ...validInput, priceUsd: 50, priceBrl: 250, priceMxn: 0 })

    const data = prismaMock.package.create.mock.calls[0][0].data
    expect(data.priceUsd).toBeInstanceOf(FakeDecimal)
    expect(data.priceBrl).toBeInstanceOf(FakeDecimal)
    expect(data.priceMxn).toBeNull()
    expect(res).toEqual({ ok: true, message: "package.created" })
  })
})

describe("updatePackage", () => {
  const synced = (over: Record<string, unknown> = {}) => ({
    termLength: 12,
    priceUsd: new FakeDecimal(50), monthlyPriceUsd: new FakeDecimal(5),
    priceBrl: new FakeDecimal(200), monthlyPriceBrl: null,
    priceMxn: null, monthlyPriceMxn: null,
    stripeAnnualPriceIdUsd: "annual_usd", stripeMonthlyPriceIdUsd: "monthly_usd",
    stripeAnnualPriceIdBrl: "annual_brl", stripeMonthlyPriceIdBrl: null,
    stripeAnnualPriceIdMxn: null,         stripeMonthlyPriceIdMxn: null,
    ...over,
  })

  // Stripe Prices are immutable, so a changed number invalidates its synced id —
  // but only that one. Editing the real price must not unsync dollars, and
  // editing an amount must not unsync the other cadence.
  it("clears only the cadence and currency whose amount changed", async () => {
    prismaMock.package.findUnique.mockResolvedValue(synced())
    prismaMock.package.update.mockResolvedValue({})
    stripeMock.prices.update.mockResolvedValue({})

    // BRL annual 200 -> 250; everything else untouched
    const res = await updatePackage("p1", {
      ...validInput, priceUsd: 50, monthlyPriceUsd: 5, priceBrl: 250, monthlyPriceBrl: 0,
    })

    const data = prismaMock.package.update.mock.calls[0][0].data
    expect(data.stripeAnnualPriceIdBrl).toBeNull()
    expect(data).not.toHaveProperty("stripeAnnualPriceIdUsd")
    expect(data).not.toHaveProperty("stripeMonthlyPriceIdUsd")
    expect(stripeMock.prices.update).toHaveBeenCalledWith("annual_brl", { active: false })
    expect(stripeMock.prices.update).not.toHaveBeenCalledWith("annual_usd", expect.anything())
    expect(res).toEqual({ ok: true, message: "package.updatedStripeCleared" })
  })

  it("clears only the monthly id when only the instalment changed", async () => {
    prismaMock.package.findUnique.mockResolvedValue(synced())
    prismaMock.package.update.mockResolvedValue({})
    stripeMock.prices.update.mockResolvedValue({})

    await updatePackage("p1", { ...validInput, priceUsd: 50, monthlyPriceUsd: 6, priceBrl: 200 })

    const data = prismaMock.package.update.mock.calls[0][0].data
    expect(data.stripeMonthlyPriceIdUsd).toBeNull()
    expect(data).not.toHaveProperty("stripeAnnualPriceIdUsd")
  })

  // termLength is every annual Price's interval_count, so moving it invalidates
  // all of them at once — and none of the monthly ones, whose interval_count is
  // always 1.
  it("clears every annual id when the term changes, and no monthly one", async () => {
    prismaMock.package.findUnique.mockResolvedValue(synced())
    prismaMock.package.update.mockResolvedValue({})
    stripeMock.prices.update.mockResolvedValue({})

    await updatePackage("p1", {
      ...validInput, termLength: 24, priceUsd: 50, monthlyPriceUsd: 5, priceBrl: 200,
    })

    const data = prismaMock.package.update.mock.calls[0][0].data
    expect(data.stripeAnnualPriceIdUsd).toBeNull()
    expect(data.stripeAnnualPriceIdBrl).toBeNull()
    expect(data).not.toHaveProperty("stripeMonthlyPriceIdUsd")
  })

  it("keeps every ref when nothing changed", async () => {
    prismaMock.package.findUnique.mockResolvedValue(synced())
    prismaMock.package.update.mockResolvedValue({})

    const res = await updatePackage("p1", {
      ...validInput, priceUsd: 50, monthlyPriceUsd: 5, priceBrl: 200,
    })

    expect(stripeMock.prices.update).not.toHaveBeenCalled()
    expect(res).toEqual({ ok: true, message: "package.updated" })
  })

  it("rejects when the package is not found", async () => {
    prismaMock.package.findUnique.mockResolvedValue(null)
    expect(await updatePackage("p1", validInput)).toEqual({ ok: false, message: "package.notFound" })
  })

  it("maps a P2025 race to 'Package not found.'", async () => {
    prismaMock.package.findUnique.mockResolvedValue({ ...noPrices, ...noIds })
    prismaMock.package.update.mockRejectedValue(new PrismaKnownError("gone", "P2025"))
    expect(await updatePackage("p1", validInput)).toEqual({ ok: false, message: "package.notFound" })
  })
})

describe("deletePackage", () => {
  it("succeeds (no message) on a clean delete", async () => {
    prismaMock.package.delete.mockResolvedValue({})
    expect(await deletePackage("p1")).toEqual({ ok: true, message: undefined })
  })

  it("maps a P2003 FK violation to the associated-sales message", async () => {
    prismaMock.package.delete.mockRejectedValue(new PrismaKnownError("fk", "P2003"))
    expect(await deletePackage("p1")).toEqual({ ok: false, message: "package.hasSales" })
  })

  it("maps a P2025 to 'Package not found.'", async () => {
    prismaMock.package.delete.mockRejectedValue(new PrismaKnownError("gone", "P2025"))
    expect(await deletePackage("p1")).toEqual({ ok: false, message: "package.notFound" })
  })
})
