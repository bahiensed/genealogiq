import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    physicalQrLicense: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    appUser: { findUnique: vi.fn() },
    passwordResetToken: { create: vi.fn() },
    $transaction: vi.fn(),
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
vi.mock("@/lib/email", () => ({ sendAppWelcomeEmail: vi.fn() }))

import {
  markGenCodePrinted,
  sellGenCodeManually,
  sellGenCodeViaPlatform,
  undoGenCodeSale,
} from "./gencode.actions"
import { verifyTenantSession } from "@/lib/dal"
import { sendAppWelcomeEmail } from "@/lib/email"
import { Prisma } from "@genealogiq/db"

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyTenantSession).mockResolvedValue({
    customerId: "c1",
    user: { id: "u1" },
  } as never)
})

describe("markGenCodePrinted — tenant-scoped ownership", () => {
  it("fails when the code is not in the caller's tenant (scoped lookup)", async () => {
    prismaMock.physicalQrLicense.findFirst.mockResolvedValue(null)

    const res = await markGenCodePrinted("GEN-1", true)

    expect(res).toEqual({ ok: false, message: "gencode.notFound" })
    expect(prismaMock.physicalQrLicense.findFirst).toHaveBeenCalledWith({
      where: { genCode: "GEN-1", tenantId: "c1" },
      select: { id: true },
    })
    expect(prismaMock.physicalQrLicense.update).not.toHaveBeenCalled()
  })

  it("toggles the printed flag and returns ok when owned", async () => {
    prismaMock.physicalQrLicense.findFirst.mockResolvedValue({ id: "lic-1" })
    prismaMock.physicalQrLicense.update.mockResolvedValue({})

    const res = await markGenCodePrinted("GEN-1", true)

    expect(res.ok).toBe(true)
    expect(prismaMock.physicalQrLicense.update).toHaveBeenCalledWith({
      where: { id: "lic-1" },
      data: { printedAt: expect.any(Date) },
    })
  })
})

describe("sellGenCodeManually — input validation + atomic sale guard", () => {
  it("rejects a blank buyer name before touching the DB", async () => {
    const res = await sellGenCodeManually("GEN-1", { buyerName: "   " })

    expect(res).toEqual({ ok: false, message: "common.invalidData" })
    expect(prismaMock.physicalQrLicense.updateMany).not.toHaveBeenCalled()
  })

  it("rejects an out-of-range value before touching the DB", async () => {
    const res = await sellGenCodeManually("GEN-1", { buyerName: "Buyer", value: -5 })

    expect(res).toEqual({ ok: false, message: "gencode.invalidValue" })
    expect(prismaMock.physicalQrLicense.updateMany).not.toHaveBeenCalled()
  })

  it("fails when no AVAILABLE code matches (double-sell guard, count === 0)", async () => {
    prismaMock.physicalQrLicense.updateMany.mockResolvedValue({ count: 0 })

    const res = await sellGenCodeManually("GEN-1", { buyerName: "Buyer", value: 100 })

    expect(res).toEqual({ ok: false, message: "gencode.notAvailable" })
    expect(prismaMock.physicalQrLicense.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { genCode: "GEN-1", tenantId: "c1", status: "AVAILABLE" },
      }),
    )
  })

  it("writes off an AVAILABLE code and returns ok", async () => {
    prismaMock.physicalQrLicense.updateMany.mockResolvedValue({ count: 1 })

    const res = await sellGenCodeManually("GEN-1", { buyerName: "Buyer", value: 100 })

    expect(res).toEqual({ ok: true, message: "gencode.saleRecorded" })
  })
})

describe("sellGenCodeViaPlatform — consumer scoping + transaction branches", () => {
  it("fails when the consumer is not in the caller's tenant", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue(null)

    const res = await sellGenCodeViaPlatform("GEN-1", "app-user-1", 100)

    expect(res).toEqual({ ok: false, message: "gencode.customerNotFound" })
    expect(prismaMock.appUser.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "app-user-1", tenantId: "c1" } }),
    )
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it("fails when the consumer has no email", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue({ id: "app-user-1", email: null })

    const res = await sellGenCodeViaPlatform("GEN-1", "app-user-1")

    expect(res).toEqual({ ok: false, message: "gencode.customerNoEmail" })
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it("maps the NOT_AVAILABLE transaction throw to a localized failure", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue({
      id: "app-user-1",
      email: "buyer@example.com",
      firstName: "Bo",
    })
    // Execute the tx callback, where updateMany returns count 0 -> throws NOT_AVAILABLE.
    prismaMock.$transaction.mockImplementation(async (cb: (tx: typeof prismaMock) => unknown) => {
      const tx = {
        physicalQrLicense: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
        passwordResetToken: { create: vi.fn() },
      }
      return cb(tx as never)
    })

    const res = await sellGenCodeViaPlatform("GEN-1", "app-user-1")

    expect(res).toEqual({ ok: false, message: "gencode.notAvailable" })
    expect(sendAppWelcomeEmail).not.toHaveBeenCalled()
  })

  it("maps a Prisma known request error to gencode.saleFailed", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue({
      id: "app-user-1",
      email: "buyer@example.com",
      firstName: "Bo",
    })
    prismaMock.$transaction.mockRejectedValue(
      new (Prisma.PrismaClientKnownRequestError as unknown as new (message: string) => Error)("P2002"),
    )

    const res = await sellGenCodeViaPlatform("GEN-1", "app-user-1")

    expect(res).toEqual({ ok: false, message: "gencode.saleFailed" })
    expect(sendAppWelcomeEmail).not.toHaveBeenCalled()
  })

  it("commits the sale, emails the buyer, and returns ok (email failure is non-fatal)", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue({
      id: "app-user-1",
      email: "buyer@example.com",
      firstName: "Bo",
    })
    prismaMock.$transaction.mockImplementation(async (cb: (tx: typeof prismaMock) => unknown) => {
      const tx = {
        physicalQrLicense: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        passwordResetToken: { create: vi.fn().mockResolvedValue({}) },
      }
      return cb(tx as never)
    })
    vi.mocked(sendAppWelcomeEmail).mockRejectedValue(new Error("smtp down"))

    const res = await sellGenCodeViaPlatform("GEN-1", "app-user-1", 100)

    expect(res).toEqual({ ok: true, message: "gencode.soldViaPlatform" })
    expect(sendAppWelcomeEmail).toHaveBeenCalledWith(
      "buyer@example.com",
      expect.any(String),
      "Bo",
      "/qr/GEN-1",
    )
  })
})

describe("undoGenCodeSale — only-while-SOLD guard", () => {
  it("fails when no SOLD code matches (already activated / never sold)", async () => {
    prismaMock.physicalQrLicense.updateMany.mockResolvedValue({ count: 0 })

    const res = await undoGenCodeSale("GEN-1")

    expect(res).toEqual({ ok: false, message: "gencode.notSold" })
    expect(prismaMock.physicalQrLicense.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { genCode: "GEN-1", tenantId: "c1", status: "SOLD" },
      }),
    )
  })

  it("reverses a SOLD code back to AVAILABLE", async () => {
    prismaMock.physicalQrLicense.updateMany.mockResolvedValue({ count: 1 })

    const res = await undoGenCodeSale("GEN-1")

    expect(res).toEqual({ ok: true, message: "gencode.saleUndone" })
  })
})
