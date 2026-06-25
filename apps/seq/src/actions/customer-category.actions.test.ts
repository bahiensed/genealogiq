import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    appUserCategory: {
      create:     vi.fn(),
      findUnique: vi.fn(),
      update:     vi.fn(),
      delete:     vi.fn(),
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
  createCustomerCategory,
  updateCustomerCategory,
  deleteCustomerCategory,
} from "./customer-category.actions"
import { verifyTenantSession } from "@/lib/dal"
import { Prisma } from "@genealogiq/db"

const validInput = {
  name:        "Premium Buyers",
  description: "Customers who buy a lot",
  isActive:    true,
}

const p2002 = () => new (Prisma.PrismaClientKnownRequestError as unknown as new (message: string) => Error)("P2002")
const p2025 = () => new (Prisma.PrismaClientKnownRequestError as unknown as new (message: string) => Error)("P2025")

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyTenantSession).mockResolvedValue({ customerId: "c1", user: { id: "u1" } } as never)
})

describe("createCustomerCategory", () => {
  it("rejects invalid input before touching the DB", async () => {
    // name < 8 chars and description < 12 chars -> zod fails
    const res = await createCustomerCategory({ name: "ab", description: "short", isActive: true })

    expect(res).toEqual({ ok: false, message: "common.invalidData" })
    expect(prismaMock.appUserCategory.create).not.toHaveBeenCalled()
  })

  it("returns ok with the created category payload on success", async () => {
    prismaMock.appUserCategory.create.mockResolvedValue({ id: "cat1", name: "Premium Buyers" })

    const res = await createCustomerCategory(validInput)

    expect(res.ok).toBe(true)
    // data-returning action: assert the typed payload shape precisely
    expect(res).toEqual({ ok: true, message: undefined, data: { category: { id: "cat1", name: "Premium Buyers" } } })
    expect(prismaMock.appUserCategory.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tenantId: "c1" }) }),
    )
  })

  it("maps a duplicate name (P2002) to customerCategory.nameExists", async () => {
    prismaMock.appUserCategory.create.mockRejectedValue(p2002())

    const res = await createCustomerCategory(validInput)

    expect(res).toEqual({ ok: false, message: "customerCategory.nameExists" })
  })

  it("rethrows unexpected (non-Prisma) errors", async () => {
    prismaMock.appUserCategory.create.mockRejectedValue(new Error("db down"))

    await expect(createCustomerCategory(validInput)).rejects.toThrow("db down")
  })
})

describe("updateCustomerCategory", () => {
  it("rejects a name already used by a different record (pre-flight dup check)", async () => {
    prismaMock.appUserCategory.findUnique.mockResolvedValue({ id: "other" })

    const res = await updateCustomerCategory("cat1", validInput)

    expect(res).toEqual({ ok: false, message: "customerCategory.nameExists" })
    expect(prismaMock.appUserCategory.update).not.toHaveBeenCalled()
  })

  it("returns done() with the localized message on a successful update", async () => {
    prismaMock.appUserCategory.findUnique.mockResolvedValue(null)
    prismaMock.appUserCategory.update.mockResolvedValue({ id: "cat1" })

    const res = await updateCustomerCategory("cat1", validInput)

    expect(res).toEqual({ ok: true, message: "customerCategory.updated" })
    expect(prismaMock.appUserCategory.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "cat1", tenantId: "c1" } }),
    )
  })

  it("maps a missing record (P2025) to customerCategory.notFound", async () => {
    prismaMock.appUserCategory.findUnique.mockResolvedValue(null)
    prismaMock.appUserCategory.update.mockRejectedValue(p2025())

    const res = await updateCustomerCategory("cat1", validInput)

    expect(res).toEqual({ ok: false, message: "customerCategory.notFound" })
  })
})

describe("deleteCustomerCategory", () => {
  it("returns done() with no message on success", async () => {
    prismaMock.appUserCategory.delete.mockResolvedValue({ id: "cat1" })

    const res = await deleteCustomerCategory("cat1")

    expect(res).toEqual({ ok: true, message: undefined })
    expect(prismaMock.appUserCategory.delete).toHaveBeenCalledWith({
      where: { id: "cat1", tenantId: "c1" },
    })
  })

  it("maps a missing record (P2025) to customerCategory.notFound", async () => {
    prismaMock.appUserCategory.delete.mockRejectedValue(p2025())

    const res = await deleteCustomerCategory("cat1")

    expect(res).toEqual({ ok: false, message: "customerCategory.notFound" })
  })
})
