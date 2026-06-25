import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    passwordResetToken: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    // $transaction runs the callback against the same mock (tx === prisma).
    $transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(prismaMock)),
  },
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }))
// Real-shaped known-request error class so `instanceof` + `.code` checks fire.
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
vi.mock("@/lib/dal", () => ({ verifyAdmin: vi.fn() }))
vi.mock("@/lib/email", () => ({ sendWelcomeEmail: vi.fn() }))

import {
  createUser,
  updateUser,
  deleteUser,
  toggleUserActive,
  resendWelcomeEmail,
} from "./user.actions"
import { Prisma } from "@genealogiq/db"
import { verifyAdmin } from "@/lib/dal"

const validUser = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  role: "USER" as const,
  nationalId: null,
  birthDate: null,
  phoneCountryCode: "55",
  phone: null,
  isActive: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyAdmin).mockResolvedValue({
    customerId: "c1",
    user: { id: "admin-1" },
  } as never)
})

describe("createUser", () => {
  it("rejects invalid input before touching the DB", async () => {
    const res = await createUser({ ...validUser, email: "not-an-email" } as never)

    expect(res).toEqual({ ok: false, message: "common.invalidData" })
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
    expect(prismaMock.user.create).not.toHaveBeenCalled()
  })

  it("maps a P2002 unique violation to user.emailExists", async () => {
    prismaMock.user.create.mockRejectedValue(
      new (Prisma.PrismaClientKnownRequestError as unknown as new (message: string) => Error)("P2002"),
    )

    const res = await createUser(validUser as never)

    expect(res).toEqual({ ok: false, message: "user.emailExists" })
  })

  it("creates the user + reset token and returns ok on the happy path", async () => {
    prismaMock.user.create.mockResolvedValue({ id: "u-new" })
    prismaMock.passwordResetToken.create.mockResolvedValue({ id: "t1" })

    const res = await createUser(validUser as never)

    expect(res.ok).toBe(true)
    expect(res.message).toBe("user.created")
    expect(prismaMock.user.create).toHaveBeenCalled()
    expect(prismaMock.passwordResetToken.create).toHaveBeenCalled()
  })
})

describe("updateUser", () => {
  it("rejects a duplicate email owned by a different user", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "other-user" })

    const res = await updateUser("u1", validUser as never)

    expect(res).toEqual({ ok: false, message: "user.emailExists" })
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it("maps a P2025 (record not found) to user.notFound", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.user.update.mockRejectedValue(
      new (Prisma.PrismaClientKnownRequestError as unknown as new (message: string) => Error)("P2025"),
    )

    const res = await updateUser("u1", validUser as never)

    expect(res).toEqual({ ok: false, message: "user.notFound" })
  })
})

describe("deleteUser", () => {
  it("guards against the admin deleting their own account", async () => {
    const res = await deleteUser("admin-1")

    expect(res).toEqual({ ok: false, message: "user.cannotDeleteSelf" })
    expect(prismaMock.user.delete).not.toHaveBeenCalled()
  })
})

describe("toggleUserActive", () => {
  it("guards against the admin deactivating themselves", async () => {
    const res = await toggleUserActive("admin-1")

    expect(res).toEqual({ ok: false, message: "user.cannotDeactivateSelf" })
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled()
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })
})

describe("resendWelcomeEmail", () => {
  it("refuses to resend once the user has set a password", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      email: "ada@example.com",
      password: "already-hashed",
      firstName: "Ada",
    })

    const res = await resendWelcomeEmail("u1")

    expect(res).toEqual({ ok: false, message: "user.passwordAlreadySet" })
    expect(prismaMock.passwordResetToken.create).not.toHaveBeenCalled()
  })

  it("fails with user.notFound when the user does not exist in the tenant", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)

    const res = await resendWelcomeEmail("missing")

    expect(res).toEqual({ ok: false, message: "user.notFound" })
  })
})
