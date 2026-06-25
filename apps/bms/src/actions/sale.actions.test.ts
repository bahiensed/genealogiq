import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, PrismaKnownError } = vi.hoisted(() => {
  class PrismaKnownError extends Error {
    code: string
    constructor(message: string, code: string) {
      super(message)
      this.code = code
    }
  }
  const prismaMock = {
    package:           { findUnique: vi.fn() },
    sale:              { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    physicalQrLicense: { createMany: vi.fn(), deleteMany: vi.fn() },
    qrInventory:       { upsert: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    $transaction:      vi.fn((cb: (tx: unknown) => Promise<unknown>) => cb(prismaMock)),
  }
  return { prismaMock, PrismaKnownError }
})

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@genealogiq/db", () => ({ Prisma: { PrismaClientKnownRequestError: PrismaKnownError } }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/dal", () => ({ verifyAdmin: vi.fn() }))
vi.mock("@/lib/gen-code", () => ({ generateGenCode: vi.fn(() => "GEN-CODE") }))
vi.mock("next-intl/server", () => ({ getTranslations: vi.fn(async () => (key: string) => key) }))

import { createSale, reverseSale } from "./sale.actions"
import { verifyAdmin } from "@/lib/dal"

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyAdmin).mockResolvedValue({ user: { id: "admin-1" } } as never)
})

describe("createSale", () => {
  it("rejects invalid input before touching the DB", async () => {
    const res = await createSale({ packageId: "", tenantId: "", quantity: 0 } as never)
    expect(res).toEqual({ ok: false, message: "common.invalidData" })
    expect(prismaMock.package.findUnique).not.toHaveBeenCalled()
  })

  it("rejects when the package does not exist", async () => {
    prismaMock.package.findUnique.mockResolvedValue(null)
    const res = await createSale({ packageId: "p1", tenantId: "c1", quantity: 2 })
    expect(res).toEqual({ ok: false, message: "sale.packageNotFound" })
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it("PHYSICAL: mints quantity × pkg.quantity licenses inside one transaction", async () => {
    prismaMock.package.findUnique.mockResolvedValue({ quantity: 10, type: "PHYSICAL" })
    prismaMock.sale.create.mockResolvedValue({ id: 99 })

    const res = await createSale({ packageId: "p1", tenantId: "c1", quantity: 2 })

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
    expect(prismaMock.sale.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ packageId: "p1", tenantId: "c1", quantity: 2, soldById: "admin-1" }),
      }),
    )
    const arg = prismaMock.physicalQrLicense.createMany.mock.calls[0][0] as { data: unknown[] }
    expect(arg.data).toHaveLength(20)
    expect(arg.data[0]).toEqual(
      expect.objectContaining({ saleId: 99, packageId: "p1", tenantId: "c1", genCode: "GEN-CODE" }),
    )
    expect(prismaMock.qrInventory.upsert).not.toHaveBeenCalled()
    expect(res).toEqual({ ok: true, message: "sale.created" })
  })

  it("DIGITAL: increments QR inventory by quantity × pkg.quantity", async () => {
    prismaMock.package.findUnique.mockResolvedValue({ quantity: 5, type: "DIGITAL" })
    prismaMock.sale.create.mockResolvedValue({ id: 100 })

    const res = await createSale({ packageId: "p1", tenantId: "c1", quantity: 3 })

    expect(prismaMock.qrInventory.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where:  { tenantId: "c1" },
        create: { tenantId: "c1", quantity: 15 },
        update: { quantity: { increment: 15 } },
      }),
    )
    expect(prismaMock.physicalQrLicense.createMany).not.toHaveBeenCalled()
    expect(res).toEqual({ ok: true, message: "sale.created" })
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
      quantity: 1, tenantId: "c1", reversedAt: new Date(), package: { quantity: 1, type: "PHYSICAL" },
    })
    expect(await reverseSale(1)).toEqual({ ok: false, message: "sale.alreadyReversed" })
  })

  it("PHYSICAL: marks reversed and deletes only AVAILABLE licenses", async () => {
    prismaMock.sale.findUnique.mockResolvedValue({
      quantity: 1, tenantId: "c1", reversedAt: null, package: { quantity: 1, type: "PHYSICAL" },
    })
    prismaMock.sale.update.mockResolvedValue({})

    const res = await reverseSale(7)

    expect(prismaMock.sale.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 7 }, data: { reversedAt: expect.any(Date) } }),
    )
    expect(prismaMock.physicalQrLicense.deleteMany).toHaveBeenCalledWith({
      where: { saleId: 7, status: "AVAILABLE" },
    })
    expect(res).toEqual({ ok: true, message: undefined })
  })

  it("maps a P2025 race to 'Sale not found.'", async () => {
    prismaMock.sale.findUnique.mockResolvedValue({
      quantity: 1, tenantId: "c1", reversedAt: null, package: { quantity: 1, type: "PHYSICAL" },
    })
    prismaMock.sale.update.mockRejectedValue(new PrismaKnownError("gone", "P2025"))
    expect(await reverseSale(7)).toEqual({ ok: false, message: "sale.notFound" })
  })
})
