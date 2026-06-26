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
    sale:    { count: vi.fn() },
    appUser: { count: vi.fn() },
    appSale: { count: vi.fn() },
    tenant:  { delete: vi.fn() },
  }
  return { prismaMock, PrismaKnownError }
})

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next-intl/server", () => ({ getTranslations: vi.fn(async () => (key: string) => key) }))
vi.mock("@genealogiq/db", () => ({ Prisma: { PrismaClientKnownRequestError: PrismaKnownError } }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/dal", () => ({ verifyAdmin: vi.fn() }))
vi.mock("@/lib/email", () => ({ sendSequoiaWelcomeEmail: vi.fn() }))
vi.mock("@genealogiq/core", () => ({
  hashToken: vi.fn((t: string) => `hashed:${t}`),
  done: (message?: string) => ({ ok: true, message }),
  fail: (message: string) => ({ ok: false, message }),
}))

import { deleteCustomer } from "./customer.actions"

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.sale.count.mockResolvedValue(0)
  prismaMock.appUser.count.mockResolvedValue(0)
  prismaMock.appSale.count.mockResolvedValue(0)
})

// A Tenant cascade-deletes its AppUser memorials + AppSale subscription rows
// (schema.prisma onDelete: Cascade). The old guard only counted the SEQ Sale
// table, so deleting a funeral home with SEQ-provisioned memorials but no Sale
// rows silently destroyed paid end-user content. These guard against that.
describe("deleteCustomer — cross-app cascade guard", () => {
  it("refuses when the tenant has SEQ-provisioned APP memorials (AppUser) and never deletes", async () => {
    prismaMock.appUser.count.mockResolvedValue(3)

    const res = await deleteCustomer("t1")

    expect(res).toEqual({ ok: false, message: "customer.hasAppData" })
    expect(prismaMock.tenant.delete).not.toHaveBeenCalled()
  })

  it("refuses when the tenant has APP subscription rows (AppSale) and never deletes", async () => {
    prismaMock.appSale.count.mockResolvedValue(1)

    const res = await deleteCustomer("t1")

    expect(res).toEqual({ ok: false, message: "customer.hasAppData" })
    expect(prismaMock.tenant.delete).not.toHaveBeenCalled()
  })

  it("still refuses on existing SEQ sales (original guard preserved)", async () => {
    prismaMock.sale.count.mockResolvedValue(2)

    const res = await deleteCustomer("t1")

    expect(res).toEqual({ ok: false, message: "customer.hasSales" })
    expect(prismaMock.tenant.delete).not.toHaveBeenCalled()
  })

  it("deletes when the tenant has no sales, memorials, or subscriptions", async () => {
    prismaMock.tenant.delete.mockResolvedValue({ id: "t1" })

    const res = await deleteCustomer("t1")

    expect(res).toEqual({ ok: true, message: undefined })
    expect(prismaMock.tenant.delete).toHaveBeenCalledWith({ where: { id: "t1" } })
  })
})
