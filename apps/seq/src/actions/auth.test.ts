import { describe, it, expect, vi, beforeEach } from "vitest"

// Hoisted mocks. The action reaches the DB via @/lib/prisma and only the
// models/methods listed here are touched by the branches under test.
const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    company: { create: vi.fn() },
    passwordResetToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    emailToken: { create: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

// redirect() in Next throws a control-flow signal; success paths reach it. We
// throw a tagged error so a test can assert the action got that far.
const REDIRECT = "NEXT_REDIRECT"
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`${REDIRECT}:${url}`)
  }),
}))

// identity translator: the localized `message` IS the i18n key.
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }))
vi.mock("@/schemas/i18n", () => ({ identityTranslator: (key: string) => key }))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/dal", () => ({ verifySession: vi.fn() }))
vi.mock("@/lib/rate-limit", () => ({ getClientIp: vi.fn(), checkRateLimit: vi.fn() }))
vi.mock("@/lib/email", () => ({
  sendPasswordResetEmail: vi.fn(),
  sendEmailChangeEmail: vi.fn(),
  sendAccountDeletionEmail: vi.fn(),
}))
vi.mock("@/auth", () => ({ signIn: vi.fn(), signOut: vi.fn() }))

// bcrypt.compare drives the password-match branches; bcrypt.hash is a no-op stub.
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async () => "hashed"),
    compare: vi.fn(async () => false),
  },
}))

// The company schema is mocked so setupSystem's two-step validation is steerable
// without constructing a full valid company payload.
const companySafeParse = vi.fn()
vi.mock("@/schemas/company.schema", () => ({
  getCompanySchema: () => ({ safeParse: companySafeParse }),
}))

// createLoginAction returns the per-action login closure; not exercised here.
vi.mock("@genealogiq/auth/login", () => ({ createLoginAction: () => vi.fn() }))

import bcrypt from "bcryptjs"
import {
  setupSystem,
  forgotPassword,
  resetPassword,
  changePassword,
  requestEmailChange,
} from "./auth"
import { verifySession } from "@/lib/dal"
import { getClientIp, checkRateLimit } from "@/lib/rate-limit"

const VALID_PASSWORD = "Str0ng!Pass"
const ALLOWED = { allowed: true, retryAfter: 0 }

const form = (entries: Record<string, string>): FormData => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.set(k, v)
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getClientIp).mockResolvedValue("1.2.3.4" as never)
  vi.mocked(checkRateLimit).mockResolvedValue(ALLOWED as never)
  vi.mocked(verifySession).mockResolvedValue({ user: { id: "u1" } } as never)
  vi.mocked(bcrypt.compare as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(false)
})

describe("setupSystem — bootstrap guards", () => {
  it("refuses to re-run once a user already exists (no writes)", async () => {
    prismaMock.user.count.mockResolvedValue(1)

    const res = await setupSystem({} as never, {} as never)

    expect(res).toEqual({ ok: false, message: "auth.systemAlreadyConfigured" })
    expect(companySafeParse).not.toHaveBeenCalled()
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it("rejects an invalid admin payload before creating anything", async () => {
    prismaMock.user.count.mockResolvedValue(0)
    companySafeParse.mockReturnValue({ success: true, data: { name: "Acme" } })

    const res = await setupSystem({} as never, {
      firstName: "A", // too short -> zod fail
      lastName: "B",
      email: "not-an-email",
      password: "weak",
    } as never)

    expect(res).toEqual({ ok: false, message: "auth.invalidAdminData" })
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled()
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it("fails when the admin email is already in use", async () => {
    prismaMock.user.count.mockResolvedValue(0)
    companySafeParse.mockReturnValue({ success: true, data: { name: "Acme" } })
    prismaMock.user.findUnique.mockResolvedValue({ id: "existing" })

    const res = await setupSystem({} as never, {
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      password: VALID_PASSWORD,
    } as never)

    expect(res).toEqual({ ok: false, message: "auth.emailInUse" })
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })
})

describe("forgotPassword — rate-limit guard", () => {
  it("returns the lockout message and never queries the user when throttled", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, retryAfter: 600 } as never)

    const res = await forgotPassword(undefined, form({ email: "ada@example.com" }))

    expect(res).toEqual({ ok: false, message: "auth.tooManyRequests" })
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled()
  })
})

describe("resetPassword — token + zod branches", () => {
  it("rejects a weak password with inline fieldErrors before touching the DB", async () => {
    const res = await resetPassword(undefined, form({ token: "t", password: "weak" }))

    expect(res?.ok).toBe(false)
    expect(res?.message).toBe("common.invalidData")
    expect(res?.fieldErrors?.password).toBeDefined()
    expect(checkRateLimit).not.toHaveBeenCalled()
    expect(prismaMock.passwordResetToken.findUnique).not.toHaveBeenCalled()
  })

  it("fails on an expired/unknown reset token", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(null)

    const res = await resetPassword(undefined, form({ token: "t", password: VALID_PASSWORD }))

    expect(res).toEqual({ ok: false, message: "auth.invalidOrExpiredLink" })
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })
})

describe("changePassword — self-service guards", () => {
  it("returns userNotFound when the session user has no password on record", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ password: null })

    const res = await changePassword(
      undefined,
      form({ currentPassword: "whatever", newPassword: VALID_PASSWORD }),
    )

    expect(res).toEqual({ ok: false, message: "auth.userNotFound" })
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it("flags an incorrect current password as a currentPassword fieldError", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ password: "hash" })
    vi.mocked(bcrypt.compare as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(false) // current != stored

    const res = await changePassword(
      undefined,
      form({ currentPassword: "wrong", newPassword: VALID_PASSWORD }),
    )

    expect(res?.ok).toBe(false)
    expect(res?.message).toBe("common.invalidData")
    expect(res?.fieldErrors?.currentPassword).toEqual(["auth.incorrectCurrentPassword"])
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it("changes the password on the happy path (done shape)", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ password: "hash" })
    const compare = vi.mocked(bcrypt.compare as unknown as ReturnType<typeof vi.fn>)
    compare
      .mockResolvedValueOnce(true) // current password matches
      .mockResolvedValueOnce(false) // new password differs from old
    prismaMock.user.update.mockResolvedValue({})

    const res = await changePassword(
      undefined,
      form({ currentPassword: VALID_PASSWORD, newPassword: "An0ther!Pass" }),
    )

    expect(res).toEqual({ ok: true, message: "auth.passwordChanged" })
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { password: "hashed" },
    })
  })
})

describe("requestEmailChange — duplicate email guard", () => {
  it("flags an already-registered new email as a newEmail fieldError", async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ email: "old@example.com", password: "hash" }) // the caller
      .mockResolvedValueOnce({ id: "someoneElse" }) // new email already taken
    vi.mocked(bcrypt.compare as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true) // password ok

    const res = await requestEmailChange(
      undefined,
      form({ newEmail: "new@example.com", currentPassword: VALID_PASSWORD }),
    )

    expect(res?.ok).toBe(false)
    expect(res?.message).toBe("common.invalidData")
    expect(res?.fieldErrors?.newEmail).toEqual(["auth.emailInUse"])
    expect(prismaMock.emailToken.create).not.toHaveBeenCalled()
  })
})
