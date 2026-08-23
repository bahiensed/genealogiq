import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, txMock } = vi.hoisted(() => ({
  prismaMock: {
    package: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
  txMock: {
    sale: { create: vi.fn() },
    genCode: { createMany: vi.fn() },
  },
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/stripe", () => ({ stripe: {} }))
vi.mock("@/lib/gen-code", () => ({ generateGenCode: () => "GQL7K2P9MNRX4FT2" }))

import { applyCheckoutSession } from "./billing"

const session = { id: "cs_1", payment_intent: "pi_1" } as never
const ctx = { tenantId: "t1", packageId: "p1", quantity: 2, soldById: "u1" }

beforeEach(() => {
  vi.clearAllMocks()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismaMock.$transaction.mockImplementation(async (cb: any) => cb(txMock))
  txMock.sale.create.mockResolvedValue({ id: 42 })
  txMock.genCode.createMany.mockResolvedValue({})
})

describe("applyCheckoutSession — fulfillment", () => {
  it("throws when the package no longer exists", async () => {
    prismaMock.package.findUnique.mockResolvedValue(null)
    await expect(applyCheckoutSession(session, ctx)).rejects.toThrow(/not found/)
  })

  it("creates one license per unit (pkg.quantity × order quantity)", async () => {
    prismaMock.package.findUnique.mockResolvedValue({ quantity: 3 })

    await applyCheckoutSession(session, ctx) // 3 × 2 = 6 units

    expect(txMock.sale.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ stripeSessionId: "cs_1", quantity: 2 }) }),
    )
    expect(txMock.genCode.createMany).toHaveBeenCalledTimes(1)
    const arg = txMock.genCode.createMany.mock.calls[0][0] as { data: unknown[] }
    expect(arg.data).toHaveLength(6)
  })

  it("is idempotent: a duplicate session (P2002) is swallowed without throwing", async () => {
    prismaMock.package.findUnique.mockResolvedValue({ quantity: 1 })
    prismaMock.$transaction.mockRejectedValue({ code: "P2002" })

    await expect(applyCheckoutSession(session, ctx)).resolves.toBeUndefined()
  })

  it("re-throws non-idempotency errors", async () => {
    prismaMock.package.findUnique.mockResolvedValue({ quantity: 1 })
    prismaMock.$transaction.mockRejectedValue(new Error("db down"))

    await expect(applyCheckoutSession(session, ctx)).rejects.toThrow("db down")
  })
})
