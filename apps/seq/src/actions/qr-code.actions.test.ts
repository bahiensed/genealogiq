import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    appUser: { findUnique: vi.fn() },
    qrCode: { update: vi.fn() },
  },
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/dal", () => ({ verifyTenantSession: vi.fn() }))

import { markQrPrinted, markQrInstalled } from "./qr-code.actions"
import { verifyTenantSession } from "@/lib/dal"
import { revalidatePath } from "next/cache"

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyTenantSession).mockResolvedValue({ customerId: "c1", user: { id: "u1" } } as never)
})

describe("markQrPrinted — tenant-scoped guard + status transition", () => {
  it("fails with notFound (and never touches the qrCode) when the memorial is not in the tenant", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue(null)

    const res = await markQrPrinted("au-1")

    // identity translator -> message is the i18n KEY
    expect(res).toEqual({ ok: false, message: "qrCode.notFound" })
    expect(prismaMock.qrCode.update).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("scopes the memorial lookup to the session's tenant", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue(null)

    await markQrPrinted("au-1")

    expect(prismaMock.appUser.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "au-1", tenantId: "c1" } }),
    )
  })

  it("transitions the QR to PRINTED and returns the done() ActionResult shape", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue({ id: "au-1" })
    prismaMock.qrCode.update.mockResolvedValue({ appUserId: "au-1", status: "PRINTED" })

    const res = await markQrPrinted("au-1")

    expect(res.ok).toBe(true)
    expect(res).toEqual({ ok: true, message: undefined })
    expect(prismaMock.qrCode.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { appUserId: "au-1" },
        data: expect.objectContaining({ status: "PRINTED" }),
      }),
    )
    // printedAt is stamped on transition
    expect(prismaMock.qrCode.update.mock.calls[0][0].data.printedAt).toBeInstanceOf(Date)
    expect(revalidatePath).toHaveBeenCalledWith("/memorialized/au-1")
  })
})

describe("markQrInstalled — tenant-scoped guard + status transition", () => {
  it("fails with notFound (and never touches the qrCode) when the memorial is not in the tenant", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue(null)

    const res = await markQrInstalled("au-2")

    expect(res).toEqual({ ok: false, message: "qrCode.notFound" })
    expect(prismaMock.qrCode.update).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("transitions the QR to INSTALLED and returns the done() ActionResult shape", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue({ id: "au-2" })
    prismaMock.qrCode.update.mockResolvedValue({ appUserId: "au-2", status: "INSTALLED" })

    const res = await markQrInstalled("au-2")

    expect(res.ok).toBe(true)
    expect(res).toEqual({ ok: true, message: undefined })
    expect(prismaMock.qrCode.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { appUserId: "au-2" },
        data: expect.objectContaining({ status: "INSTALLED" }),
      }),
    )
    // installedAt is stamped on transition
    expect(prismaMock.qrCode.update.mock.calls[0][0].data.installedAt).toBeInstanceOf(Date)
    expect(revalidatePath).toHaveBeenCalledWith("/memorialized/au-2")
  })
})
