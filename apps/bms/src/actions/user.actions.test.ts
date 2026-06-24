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
    user:               { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    passwordResetToken: { create: vi.fn(), deleteMany: vi.fn() },
    $transaction:       vi.fn((cb: (tx: unknown) => Promise<unknown>) => cb(prismaMock)),
  }
  return { prismaMock, PrismaKnownError }
})

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@genealogiq/db", () => ({ Prisma: { PrismaClientKnownRequestError: PrismaKnownError } }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/dal", () => ({ verifyAdmin: vi.fn() }))
vi.mock("@/lib/email", () => ({ sendWelcomeEmail: vi.fn() }))
vi.mock("@genealogiq/core", () => ({ hashToken: vi.fn((t: string) => `hashed:${t}`) }))

import { createUser, deleteUser, toggleUserActive } from "./user.actions"
import { verifyAdmin } from "@/lib/dal"
import { sendWelcomeEmail } from "@/lib/email"

const validUser = {
  firstName:        "Ana",
  lastName:         "Silva",
  email:            "ana@example.com",
  role:             "ADMIN" as const,
  phoneCountryCode: "55",
  isActive:         true,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyAdmin).mockResolvedValue({ user: { id: "admin-1" } } as never)
})

describe("createUser", () => {
  it("rejects invalid input", async () => {
    const res = await createUser({ ...validUser, email: "not-an-email" } as never)
    expect(res).toEqual({ error: "Invalid data" })
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it("creates the user + a HASHED reset token in one transaction and emails the RAW token", async () => {
    prismaMock.user.create.mockResolvedValue({ id: "u1" })
    prismaMock.passwordResetToken.create.mockResolvedValue({})

    const res = await createUser(validUser)

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
    const tokenArg = prismaMock.passwordResetToken.create.mock.calls[0][0] as {
      data: { token: string; userId: string }
    }
    expect(tokenArg.data.userId).toBe("u1")
    expect(tokenArg.data.token).toMatch(/^hashed:/) // stored hashed, never raw
    expect(sendWelcomeEmail).toHaveBeenCalledTimes(1)
    const [emailTo, rawToken] = vi.mocked(sendWelcomeEmail).mock.calls[0]
    expect(emailTo).toBe("ana@example.com")
    expect(`hashed:${rawToken}`).toBe(tokenArg.data.token) // email carries the raw token; DB keeps its hash
    expect(res).toEqual({ success: "User created successfully." })
  })

  it("maps a P2002 duplicate to 'This email is already in use'", async () => {
    prismaMock.user.create.mockRejectedValue(new PrismaKnownError("dup", "P2002"))
    expect(await createUser(validUser)).toEqual({ error: "This email is already in use" })
    expect(sendWelcomeEmail).not.toHaveBeenCalled()
  })
})

describe("deleteUser", () => {
  it("refuses to delete your own account", async () => {
    expect(await deleteUser("admin-1")).toEqual({ error: "You cannot delete your own account." })
    expect(prismaMock.user.delete).not.toHaveBeenCalled()
  })

  it("maps a P2025 to 'User not found.'", async () => {
    prismaMock.user.delete.mockRejectedValue(new PrismaKnownError("gone", "P2025"))
    expect(await deleteUser("other")).toEqual({ error: "User not found." })
  })

  it("succeeds (returns void) on a clean delete", async () => {
    prismaMock.user.delete.mockResolvedValue({})
    expect(await deleteUser("other")).toBeUndefined()
  })
})

describe("toggleUserActive", () => {
  it("refuses to deactivate your own account", async () => {
    expect(await toggleUserActive("admin-1")).toEqual({ error: "You cannot deactivate your own account." })
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled()
  })

  it("flips isActive for another user", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ isActive: true })
    prismaMock.user.update.mockResolvedValue({})
    expect(await toggleUserActive("other")).toBeUndefined()
    expect(prismaMock.user.update).toHaveBeenCalledWith({ where: { id: "other" }, data: { isActive: false } })
  })
})
