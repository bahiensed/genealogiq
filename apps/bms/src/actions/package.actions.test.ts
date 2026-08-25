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
  name:        "GenCode",
  quantity:    10,
  description: "Produto com 10 GenCodes",
  price:       50,
  isActive:    true,
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

  it("stores price as a Prisma.Decimal", async () => {
    prismaMock.package.create.mockResolvedValue({ id: "p1" })
    const res = await createPackage(validInput)

    const arg = prismaMock.package.create.mock.calls[0][0] as { data: { price: unknown } }
    expect(arg.data.price).toBeInstanceOf(FakeDecimal)
    expect(res).toEqual({ ok: true, message: "package.created" })
  })
})

describe("updatePackage", () => {
  it("clears the Stripe price ref (but keeps the reusable product) when the price changes on a synced package", async () => {
    prismaMock.package.findUnique.mockResolvedValue({ price: new FakeDecimal(40), stripePriceId: "price_1" })
    prismaMock.package.update.mockResolvedValue({})
    stripeMock.prices.update.mockResolvedValue({})

    const res = await updatePackage("p1", validInput) // price 50 ≠ 40

    const arg = prismaMock.package.update.mock.calls[0][0] as { data: Record<string, unknown> }
    expect(arg.data).not.toHaveProperty("stripeProductId")
    expect(arg.data.stripePriceId).toBeNull()
    expect(stripeMock.prices.update).toHaveBeenCalledWith("price_1", { active: false })
    expect(res).toEqual({ ok: true, message: "package.updatedStripeCleared" })
  })

  it("keeps the Stripe refs when the price is unchanged", async () => {
    prismaMock.package.findUnique.mockResolvedValue({ price: new FakeDecimal(50), stripePriceId: "price_1" })
    prismaMock.package.update.mockResolvedValue({})

    const res = await updatePackage("p1", validInput) // price 50 === 50

    const arg = prismaMock.package.update.mock.calls[0][0] as { data: Record<string, unknown> }
    expect(arg.data).not.toHaveProperty("stripeProductId")
    expect(arg.data).not.toHaveProperty("stripePriceId")
    expect(res).toEqual({ ok: true, message: "package.updated" })
  })

  it("rejects when the package is not found", async () => {
    prismaMock.package.findUnique.mockResolvedValue(null)
    expect(await updatePackage("p1", validInput)).toEqual({ ok: false, message: "package.notFound" })
  })

  it("maps a P2025 race to 'Package not found.'", async () => {
    prismaMock.package.findUnique.mockResolvedValue({ price: new FakeDecimal(40), stripePriceId: null })
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
