import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    supplierCategory: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
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
  createSupplierCategory,
  updateSupplierCategory,
  deleteSupplierCategory,
  toggleSupplierCategoryActive,
} from "./supplier-category.actions"
import { verifyTenantSession } from "@/lib/dal"
import { Prisma } from "@genealogiq/db"

// name min 8 / description min 12 (see supplier-category.schema)
const validInput = { name: "Hardware", description: "Hardware suppliers", isActive: true }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyTenantSession).mockResolvedValue({ customerId: "c1", user: { id: "u1" } } as never)
})

describe("createSupplierCategory", () => {
  it("rejects invalid input before touching the DB", async () => {
    const res = await createSupplierCategory({ name: "x", description: "y", isActive: true })

    expect(res).toEqual({ ok: false, message: "common.invalidData" })
    expect(prismaMock.supplierCategory.create).not.toHaveBeenCalled()
  })

  it("maps a P2002 unique-constraint violation to common.duplicate", async () => {
    prismaMock.supplierCategory.create.mockRejectedValue(
      new (Prisma.PrismaClientKnownRequestError as unknown as new (message: string) => Error)("P2002"),
    )

    const res = await createSupplierCategory(validInput)

    expect(res).toEqual({ ok: false, message: "common.duplicate" })
  })

  it("creates a tenant-scoped category and reports success", async () => {
    prismaMock.supplierCategory.create.mockResolvedValue({ id: "1" })

    const res = await createSupplierCategory(validInput)

    expect(res.ok).toBe(true)
    expect(res.message).toBe("supplierCategory.created")
    expect(prismaMock.supplierCategory.create).toHaveBeenCalledWith({
      data: { ...validInput, tenantId: "c1" },
    })
  })

  it("rethrows non-known Prisma errors", async () => {
    prismaMock.supplierCategory.create.mockRejectedValue(new Error("boom"))

    await expect(createSupplierCategory(validInput)).rejects.toThrow("boom")
  })
})

describe("updateSupplierCategory", () => {
  it("rejects when the name collides with a different category (pre-write dup guard)", async () => {
    prismaMock.supplierCategory.findUnique.mockResolvedValue({ id: "other" })

    const res = await updateSupplierCategory("id1", validInput)

    expect(res).toEqual({ ok: false, message: "common.duplicate" })
    expect(prismaMock.supplierCategory.update).not.toHaveBeenCalled()
  })

  it("maps a P2025 record-not-found to supplierCategory.notFound", async () => {
    prismaMock.supplierCategory.findUnique.mockResolvedValue(null)
    prismaMock.supplierCategory.update.mockRejectedValue(
      new (Prisma.PrismaClientKnownRequestError as unknown as new (message: string) => Error)("P2025"),
    )

    const res = await updateSupplierCategory("id1", validInput)

    expect(res).toEqual({ ok: false, message: "supplierCategory.notFound" })
  })

  it("updates the same record (matching id is not treated as a dup) and reports success", async () => {
    prismaMock.supplierCategory.findUnique.mockResolvedValue({ id: "id1" })
    prismaMock.supplierCategory.update.mockResolvedValue({ id: "id1" })

    const res = await updateSupplierCategory("id1", validInput)

    expect(res.ok).toBe(true)
    expect(res.message).toBe("supplierCategory.updated")
    expect(prismaMock.supplierCategory.update).toHaveBeenCalledWith({
      where: { id: "id1", tenantId: "c1" },
      data: validInput,
    })
  })
})

describe("deleteSupplierCategory", () => {
  it("maps a P2025 record-not-found to supplierCategory.notFound", async () => {
    prismaMock.supplierCategory.delete.mockRejectedValue(
      new (Prisma.PrismaClientKnownRequestError as unknown as new (message: string) => Error)("P2025"),
    )

    const res = await deleteSupplierCategory("id1")

    expect(res).toEqual({ ok: false, message: "supplierCategory.notFound" })
  })

  it("deletes a tenant-scoped record and returns a bare success result", async () => {
    prismaMock.supplierCategory.delete.mockResolvedValue({ id: "id1" })

    const res = await deleteSupplierCategory("id1")

    expect(res.ok).toBe(true)
    expect(prismaMock.supplierCategory.delete).toHaveBeenCalledWith({
      where: { id: "id1", tenantId: "c1" },
    })
  })
})

describe("toggleSupplierCategoryActive", () => {
  it("fails with supplierCategory.notFound when the category is missing", async () => {
    prismaMock.supplierCategory.findUnique.mockResolvedValue(null)

    const res = await toggleSupplierCategoryActive("id1")

    expect(res).toEqual({ ok: false, message: "supplierCategory.notFound" })
    expect(prismaMock.supplierCategory.update).not.toHaveBeenCalled()
  })

  it("flips isActive on the existing category", async () => {
    prismaMock.supplierCategory.findUnique.mockResolvedValue({ isActive: true })
    prismaMock.supplierCategory.update.mockResolvedValue({ id: "id1" })

    const res = await toggleSupplierCategoryActive("id1")

    expect(res.ok).toBe(true)
    expect(prismaMock.supplierCategory.update).toHaveBeenCalledWith({
      where: { id: "id1" },
      data: { isActive: false },
    })
  })
})
