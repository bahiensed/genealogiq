import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    supplier: {
      findFirst:  vi.fn(),
      findUnique: vi.fn(),
      create:     vi.fn(),
      update:     vi.fn(),
      delete:     vi.fn(),
    },
  },
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
// Identity translator: the returned message IS the key, so we can assert on keys.
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }))
vi.mock("@genealogiq/db", () => ({
  Prisma: {
    PrismaClientKnownRequestError: class extends Error {
      code: string
      constructor(code: string) {
        super(code)
        this.code = code
      }
    },
  },
}))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/dal", () => ({ verifyTenantSession: vi.fn() }))

import {
  createSupplier,
  updateSupplier,
  deleteSupplier,
  toggleSupplierActive,
} from "./supplier.actions"
import { verifyTenantSession } from "@/lib/dal"
import { Prisma } from "@genealogiq/db"

// A structurally valid COMPANY supplier (real CNPJ that passes validateCnpj).
const validInput = {
  entityType:            "COMPANY" as const,
  name:                  "Acme Corp",
  tradeName:             "Acme",
  taxId:                 "11222333000181",
  stateRegistration:     null,
  municipalRegistration: null,
  birthDate:             null,
  email:                 "ops@acme.test",
  phoneCountryCode:      "55",
  phone:                 "11999999999",
  notes:                 null,
  categoryId:            "cat-1",
  isActive:              true,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyTenantSession).mockResolvedValue({
    customerId: "tenant-1",
    user: { id: "u1" },
  } as never)
})

describe("createSupplier", () => {
  it("rejects invalid input before touching the DB", async () => {
    const res = await createSupplier({ ...validInput, email: "not-an-email" } as never)

    expect(res).toEqual({ ok: false, message: "common.invalidData" })
    expect(prismaMock.supplier.findFirst).not.toHaveBeenCalled()
    expect(prismaMock.supplier.create).not.toHaveBeenCalled()
  })

  it("fails with taxIdExists when a tenant-scoped duplicate taxId is found (no create)", async () => {
    prismaMock.supplier.findFirst.mockResolvedValue({ id: "existing" })

    const res = await createSupplier(validInput as never)

    expect(res).toEqual({ ok: false, message: "supplier.taxIdExists" })
    expect(prismaMock.supplier.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { taxId: "11222333000181", tenantId: "tenant-1" },
      }),
    )
    expect(prismaMock.supplier.create).not.toHaveBeenCalled()
  })

  it("maps a Prisma P2002 unique violation to common.duplicate", async () => {
    prismaMock.supplier.findFirst.mockResolvedValue(null)
    prismaMock.supplier.create.mockRejectedValue(
      new (Prisma.PrismaClientKnownRequestError as unknown as new (message: string) => Error)("P2002"),
    )

    const res = await createSupplier(validInput as never)

    expect(res).toEqual({ ok: false, message: "common.duplicate" })
  })

  it("returns a success ActionResult on the happy path", async () => {
    prismaMock.supplier.findFirst.mockResolvedValue(null)
    prismaMock.supplier.create.mockResolvedValue({ id: "new-1" })

    const res = await createSupplier(validInput as never)

    expect(res.ok).toBe(true)
    expect(res).toEqual({ ok: true, message: "supplier.created" })
  })
})

describe("updateSupplier", () => {
  it("fails with taxIdExists when another supplier owns the taxId", async () => {
    prismaMock.supplier.findFirst.mockResolvedValue({ id: "other" })

    const res = await updateSupplier("sup-1", validInput as never)

    expect(res).toEqual({ ok: false, message: "supplier.taxIdExists" })
    // dup check must exclude the record being edited
    expect(prismaMock.supplier.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { taxId: "11222333000181", tenantId: "tenant-1", NOT: { id: "sup-1" } },
      }),
    )
    expect(prismaMock.supplier.update).not.toHaveBeenCalled()
  })

  it("maps a Prisma P2025 (record not found) to supplier.notFound", async () => {
    prismaMock.supplier.findFirst.mockResolvedValue(null)
    prismaMock.supplier.update.mockRejectedValue(
      new (Prisma.PrismaClientKnownRequestError as unknown as new (message: string) => Error)("P2025"),
    )

    const res = await updateSupplier("missing", validInput as never)

    expect(res).toEqual({ ok: false, message: "supplier.notFound" })
  })
})

describe("deleteSupplier", () => {
  it("maps a Prisma P2025 on delete to supplier.notFound", async () => {
    prismaMock.supplier.delete.mockRejectedValue(
      new (Prisma.PrismaClientKnownRequestError as unknown as new (message: string) => Error)("P2025"),
    )

    const res = await deleteSupplier("missing")

    expect(res).toEqual({ ok: false, message: "supplier.notFound" })
  })

  it("rethrows an unhandled Prisma error (e.g. P2003 FK / dependents) instead of swallowing it", async () => {
    // deleteSupplier only catches P2025; a dependents/foreign-key error must surface.
    prismaMock.supplier.delete.mockRejectedValue(
      new (Prisma.PrismaClientKnownRequestError as unknown as new (message: string) => Error)("P2003"),
    )

    await expect(deleteSupplier("sup-1")).rejects.toMatchObject({ code: "P2003" })
  })

  it("returns a bare success ActionResult (done) when delete succeeds", async () => {
    prismaMock.supplier.delete.mockResolvedValue({ id: "sup-1" })

    const res = await deleteSupplier("sup-1")

    expect(res).toEqual({ ok: true, message: undefined })
    expect(prismaMock.supplier.delete).toHaveBeenCalledWith({
      where: { id: "sup-1", tenantId: "tenant-1" },
    })
  })
})

describe("toggleSupplierActive", () => {
  it("fails with supplier.notFound when the record is absent (no update)", async () => {
    prismaMock.supplier.findUnique.mockResolvedValue(null)

    const res = await toggleSupplierActive("missing")

    expect(res).toEqual({ ok: false, message: "supplier.notFound" })
    expect(prismaMock.supplier.update).not.toHaveBeenCalled()
  })

  it("flips isActive and returns success", async () => {
    prismaMock.supplier.findUnique.mockResolvedValue({ isActive: true })
    prismaMock.supplier.update.mockResolvedValue({ id: "sup-1", isActive: false })

    const res = await toggleSupplierActive("sup-1")

    expect(res.ok).toBe(true)
    expect(prismaMock.supplier.update).toHaveBeenCalledWith({
      where: { id: "sup-1" },
      data: { isActive: false },
    })
  })
})
