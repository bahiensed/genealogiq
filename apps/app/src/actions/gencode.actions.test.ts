import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock, txMock, safeParseMock } = vi.hoisted(() => ({
  prismaMock: {
    genCode: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
  txMock: {
    appUser: { create: vi.fn() },
    appUserGuardian: { create: vi.fn() },
    genCode: { update: vi.fn() },
  },
  safeParseMock: vi.fn(),
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/dal", () => ({ verifySession: vi.fn() }))
// The action localizes its business messages via getTranslations('Actions').
// Stub it to echo the key so assertions can pin the exact message source.
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}))
// The action calls getMemorialSchema(identityTranslator).safeParse(data); stub the
// factory so it always hands back an object whose safeParse we control per-test.
vi.mock("@/schemas/memorial.schema", () => ({ getMemorialSchema: () => ({ safeParse: safeParseMock }) }))

import { activateGenCode } from "./gencode.actions"
import { verifySession } from "@/lib/dal"

const MEMORIAL = { firstName: "Ana", lastName: "Silva" }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifySession).mockResolvedValue({ user: { id: "guardian-1" } } as never)
  safeParseMock.mockReturnValue({ success: true, data: MEMORIAL })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismaMock.$transaction.mockImplementation(async (cb: any) => cb(txMock))
  txMock.appUser.create.mockResolvedValue({ id: "memo-1" })
  txMock.appUserGuardian.create.mockResolvedValue({})
  txMock.genCode.update.mockResolvedValue({})
})

describe("activateGenCode", () => {
  it("rejects an unknown gen code", async () => {
    prismaMock.genCode.findUnique.mockResolvedValue(null)
    expect(await activateGenCode("NOPE", MEMORIAL)).toEqual({ ok: false, message: "gencode.notFound" })
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it("rejects a code that is no longer AVAILABLE (double-activation guard)", async () => {
    prismaMock.genCode.findUnique.mockResolvedValue({ id: "lic-1", status: "ACTIVATED" })
    expect(await activateGenCode("GENCODE", MEMORIAL)).toEqual({
      ok: false,
      message: "gencode.alreadyActivated",
    })
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it("rejects invalid memorial data before mutating", async () => {
    prismaMock.genCode.findUnique.mockResolvedValue({ id: "lic-1", status: "AVAILABLE" })
    safeParseMock.mockReturnValue({ success: false, error: { issues: [{ message: "First name required" }] } })
    expect(await activateGenCode("GENCODE", MEMORIAL)).toEqual({ ok: false, message: "First name required" })
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it("activates: creates the memorial + guardian link and marks the license ACTIVATED", async () => {
    prismaMock.genCode.findUnique.mockResolvedValue({ id: "lic-1", status: "AVAILABLE" })

    const res = await activateGenCode("GENCODE", MEMORIAL)

    expect(res).toEqual({ ok: true, data: { id: "memo-1" }, message: undefined })
    expect(txMock.appUserGuardian.create).toHaveBeenCalledWith({
      data: { appUserId: "memo-1", guardianId: "guardian-1" },
    })
    expect(txMock.genCode.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "lic-1" },
        data: expect.objectContaining({ status: "ACTIVATED", appUserId: "memo-1" }),
      }),
    )
  })

  it("handles the activation race: a concurrent winner (P2002) yields a friendly retry error", async () => {
    prismaMock.genCode.findUnique.mockResolvedValue({ id: "lic-1", status: "AVAILABLE" })
    prismaMock.$transaction.mockRejectedValue({ code: "P2002" })

    expect(await activateGenCode("GENCODE", MEMORIAL)).toEqual({
      ok: false,
      message: "gencode.raceRetry",
    })
  })
})
