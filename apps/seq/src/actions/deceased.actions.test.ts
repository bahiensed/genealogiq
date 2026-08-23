import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    appUser: { count: vi.fn(), findUnique: vi.fn() },
    appUserGuardian: { create: vi.fn(), delete: vi.fn() },
  },
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock('@genealogiq/db', () => ({
  Prisma: { PrismaClientKnownRequestError: class extends Error {} },
}))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/dal", () => ({ verifyTenantSession: vi.fn() }))
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }))
vi.mock("@/schemas/deceased.schema", () => ({
  getDeceasedSchema: () => ({ safeParse: vi.fn() }),
}))
vi.mock("@/schemas/i18n", () => ({ identityTranslator: (key: string) => key }))

import { addGuardian, removeGuardian } from "./deceased.actions"
import { verifyTenantSession } from "@/lib/dal"

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyTenantSession).mockResolvedValue({ customerId: "c1", user: { id: "u1" } } as never)
})

describe("addGuardian — C4 cross-tenant IDOR guard", () => {
  it("refuses when the ids do not BOTH belong to the caller's tenant", async () => {
    prismaMock.appUser.count.mockResolvedValue(1) // only one of the two is in tenant c1

    const res = await addGuardian("memorial-x", "guardian-y")

    expect(res).toEqual({ ok: false, message: "deceased.notFound" })
    expect(prismaMock.appUserGuardian.create).not.toHaveBeenCalled()
  })

  it("scopes the membership check to the caller's tenant and links when both belong", async () => {
    prismaMock.appUser.count.mockResolvedValue(2)
    prismaMock.appUserGuardian.create.mockResolvedValue({})

    const res = await addGuardian("memorial-x", "guardian-y")

    expect(res).toEqual({ ok: true, message: "deceased.guardianAdded" })
    expect(prismaMock.appUser.count).toHaveBeenCalledWith({
      where: { id: { in: ["memorial-x", "guardian-y"] }, tenantId: "c1" },
    })
    expect(prismaMock.appUserGuardian.create).toHaveBeenCalled()
  })
})

describe("removeGuardian — C4 cross-tenant IDOR guard", () => {
  it("refuses to unlink when the ids are not both in the caller's tenant", async () => {
    prismaMock.appUser.count.mockResolvedValue(1)

    const res = await removeGuardian("memorial-x", "guardian-y")

    expect(res).toEqual({ ok: false, message: "deceased.relationNotFound" })
    expect(prismaMock.appUserGuardian.delete).not.toHaveBeenCalled()
  })

  it("unlinks when both ids belong to the caller's tenant", async () => {
    prismaMock.appUser.count.mockResolvedValue(2)
    prismaMock.appUserGuardian.delete.mockResolvedValue({})

    await removeGuardian("memorial-x", "guardian-y")

    expect(prismaMock.appUserGuardian.delete).toHaveBeenCalled()
  })
})
