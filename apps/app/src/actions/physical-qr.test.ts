import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, txMock } = vi.hoisted(() => ({
  prismaMock: {
    physicalQrLicense: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
  txMock: {
    appUser: { create: vi.fn() },
    appUserGuardian: { create: vi.fn() },
    physicalQrLicense: { update: vi.fn() },
  },
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/dal", () => ({ verifySession: vi.fn() }))
vi.mock("@/schemas/memorial", () => ({ memorialSchema: { safeParse: vi.fn() } }))

import { activatePhysicalQr } from "./physical-qr"
import { verifySession } from "@/lib/dal"
import { memorialSchema } from "@/schemas/memorial"

const MEMORIAL = { firstName: "Ana", lastName: "Silva" }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifySession).mockResolvedValue({ user: { id: "guardian-1" } } as never)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(memorialSchema.safeParse as any).mockReturnValue({ success: true, data: MEMORIAL })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismaMock.$transaction.mockImplementation(async (cb: any) => cb(txMock))
  txMock.appUser.create.mockResolvedValue({ id: "memo-1" })
  txMock.appUserGuardian.create.mockResolvedValue({})
  txMock.physicalQrLicense.update.mockResolvedValue({})
})

describe("activatePhysicalQr", () => {
  it("rejects an unknown gen code", async () => {
    prismaMock.physicalQrLicense.findUnique.mockResolvedValue(null)
    expect(await activatePhysicalQr("NOPE", MEMORIAL)).toEqual({ error: "QR code not found." })
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it("rejects a code that is no longer AVAILABLE (double-activation guard)", async () => {
    prismaMock.physicalQrLicense.findUnique.mockResolvedValue({ id: "lic-1", status: "ACTIVATED" })
    expect(await activatePhysicalQr("GENCODE", MEMORIAL)).toEqual({
      error: "This code has already been activated.",
    })
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it("rejects invalid memorial data before mutating", async () => {
    prismaMock.physicalQrLicense.findUnique.mockResolvedValue({ id: "lic-1", status: "AVAILABLE" })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(memorialSchema.safeParse as any).mockReturnValue({ success: false, error: { issues: [{ message: "First name required" }] } })
    expect(await activatePhysicalQr("GENCODE", MEMORIAL)).toEqual({ error: "First name required" })
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it("activates: creates the memorial + guardian link and marks the license ACTIVATED", async () => {
    prismaMock.physicalQrLicense.findUnique.mockResolvedValue({ id: "lic-1", status: "AVAILABLE" })

    const res = await activatePhysicalQr("GENCODE", MEMORIAL)

    expect(res).toEqual({ success: true, id: "memo-1" })
    expect(txMock.appUserGuardian.create).toHaveBeenCalledWith({
      data: { appUserId: "memo-1", guardianId: "guardian-1" },
    })
    expect(txMock.physicalQrLicense.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "lic-1" },
        data: expect.objectContaining({ status: "ACTIVATED", appUserId: "memo-1" }),
      }),
    )
  })

  it("handles the activation race: a concurrent winner (P2002) yields a friendly retry error", async () => {
    prismaMock.physicalQrLicense.findUnique.mockResolvedValue({ id: "lic-1", status: "AVAILABLE" })
    prismaMock.$transaction.mockRejectedValue({ code: "P2002" })

    expect(await activatePhysicalQr("GENCODE", MEMORIAL)).toEqual({
      error: "This code was just activated. Please try again.",
    })
  })
})
