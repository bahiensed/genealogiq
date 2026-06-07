import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { appUser: { findUnique: vi.fn() } },
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock('@genealogiq/db', () => ({ Prisma: {} }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/dal", () => ({ verifyTenantSession: vi.fn() }))
vi.mock("@/lib/email", () => ({ sendAppWelcomeEmail: vi.fn() }))

import { createAppSale } from "./sale.actions"
import { verifyTenantSession } from "@/lib/dal"

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyTenantSession).mockResolvedValue({ customerId: "c1", user: { id: "u1" } } as never)
})

describe("createAppSale — A3 server-side value validation", () => {
  it.each([
    ["negative", -5],
    ["NaN", Number.NaN],
    ["infinite", Number.POSITIVE_INFINITY],
    ["above the cap", 1_000_001],
  ])("rejects a %s value before touching the DB", async (_label, value) => {
    const res = await createAppSale("app-user-1", "sub-1", value as number)

    expect(res).toEqual({ error: "Invalid sale value." })
    expect(prismaMock.appUser.findUnique).not.toHaveBeenCalled()
  })

  it("accepts a valid value and proceeds (tenant-scoped customer lookup)", async () => {
    // A valid value passes the gate; we then short-circuit at the customer lookup.
    prismaMock.appUser.findUnique.mockResolvedValue(null)

    const res = await createAppSale("app-user-1", "sub-1", 100)

    expect(res).toEqual({ error: "Customer not found." })
    expect(prismaMock.appUser.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "app-user-1", tenantId: "c1" } }),
    )
  })
})
