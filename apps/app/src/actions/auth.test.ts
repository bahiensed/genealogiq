import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// auth.ts actions return the canonical ActionResult union (ok/done/fail from
// @genealogiq/core), widened with an optional `fieldErrors` slot for the inline
// form errors (the `AuthState` type). Failures assert { ok: false, message } and
// (where relevant) the `fieldErrors` shape; success-with-redirect paths throw the
// mocked `redirect`. getTranslations is stubbed to echo the KEY, so every asserted
// message IS the translation key.
// ---------------------------------------------------------------------------

const { prismaMock, txMock } = vi.hoisted(() => ({
  prismaMock: {
    appUser: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    emailToken: { create: vi.fn(), deleteMany: vi.fn() },
    passwordResetToken: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
  txMock: {},
}))

// redirect throws in real Next; emulate that so success paths short-circuit and
// we can assert "it redirected" by catching the sentinel.
class RedirectError extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT:${url}`)
  }
}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectError(url)
  },
}))

// Echo the key so asserted messages ARE the i18n key.
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/dal", () => ({ verifySession: vi.fn() }))
vi.mock("@/lib/email", () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendEmailChangeEmail: vi.fn(),
  sendAccountDeletionEmail: vi.fn(),
}))
vi.mock("@/lib/safe-callback", () => ({ safeCallback: vi.fn(() => null) }))
vi.mock("@/lib/blob", () => ({ deleteBlobs: vi.fn() }))
vi.mock("@/lib/rate-limit", () => ({
  getClientIp: vi.fn(async () => "1.2.3.4"),
  checkRateLimit: vi.fn(async () => ({ allowed: true, retryAfter: 0 })),
}))
vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn(async () => "HASHED"), compare: vi.fn(async () => true) },
}))
vi.mock("@/auth", () => ({ signIn: vi.fn(), signOut: vi.fn() }))
// _login is built from this factory at module import; return a no-op callable.
vi.mock("@genealogiq/auth/login", () => ({ createLoginAction: () => vi.fn(async () => undefined) }))

import {
  signUp,
  forgotPassword,
  resetPassword,
  changePassword,
  requestEmailChange,
} from "./auth"
import { verifySession } from "@/lib/dal"
import { checkRateLimit } from "@/lib/rate-limit"
import bcrypt from "bcryptjs"
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email"

// A FormData factory keyed by the names the action reads.
const fd = (fields: Record<string, string>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(fields)) f.append(k, v)
  return f
}

const VALID_SIGNUP = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  password: "Str0ng!Pass",
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifySession).mockResolvedValue({ user: { id: "user-1" } } as never)
  vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, retryAfter: 0 } as never)
  vi.mocked(bcrypt.hash).mockResolvedValue("HASHED" as never)
  vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
  prismaMock.$transaction.mockResolvedValue([])
})

// --- signUp --------------------------------------------------------------
describe("signUp", () => {
  it("rejects invalid input with per-field zod errors and never touches the DB", async () => {
    const res = await signUp(undefined, fd({ firstName: "A", lastName: "B", email: "nope", password: "weak" }))

    expect(res?.ok).toBe(false)
    expect(res?.message).toBe("common.invalidData")
    // flattenError → per-field arrays; at least email + password fail.
    expect(res?.fieldErrors).toBeTruthy()
    expect(res?.fieldErrors?.email?.length).toBeGreaterThan(0)
    expect(res?.fieldErrors?.password?.length).toBeGreaterThan(0)
    expect(prismaMock.appUser.findFirst).not.toHaveBeenCalled()
    expect(prismaMock.appUser.create).not.toHaveBeenCalled()
  })

  it("bails on rate-limit BEFORE any user lookup or write", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, retryAfter: 1800 } as never)

    const res = await signUp(undefined, fd(VALID_SIGNUP))

    expect(res).toEqual({ ok: false, message: "auth.tooManySignUpAttempts" })
    expect(prismaMock.appUser.findFirst).not.toHaveBeenCalled()
    expect(prismaMock.appUser.create).not.toHaveBeenCalled()
  })

  it("reports a duplicate email as an inline field error and does not create the user", async () => {
    prismaMock.appUser.findFirst.mockResolvedValue({ id: "existing" })

    const res = await signUp(undefined, fd(VALID_SIGNUP))

    expect(res?.ok).toBe(false)
    expect(res?.message).toBe("common.invalidData")
    expect(res?.fieldErrors).toEqual({ email: ["auth.emailInUse"] })
    expect(prismaMock.appUser.create).not.toHaveBeenCalled()
  })

  it("creates the user, issues a verification token, sends mail, and redirects to /verify-email", async () => {
    prismaMock.appUser.findFirst.mockResolvedValue(null)
    prismaMock.appUser.create.mockResolvedValue({ id: "new-user" })
    prismaMock.emailToken.deleteMany.mockResolvedValue({})
    prismaMock.emailToken.create.mockResolvedValue({})

    await expect(signUp(undefined, fd(VALID_SIGNUP))).rejects.toThrow("NEXT_REDIRECT:/verify-email")

    expect(prismaMock.appUser.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: "ada@example.com", role: "APP_USER" }) }),
    )
    expect(prismaMock.emailToken.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: "VERIFICATION", appUserId: "new-user" }) }),
    )
    expect(sendVerificationEmail).toHaveBeenCalledTimes(1)
  })
})

// --- forgotPassword ------------------------------------------------------
describe("forgotPassword", () => {
  it("rejects an invalid email before rate-limit or DB lookup", async () => {
    const res = await forgotPassword(undefined, fd({ email: "not-an-email" }))

    expect(res).toEqual({ ok: false, message: "auth.invalidEmail" })
    expect(checkRateLimit).not.toHaveBeenCalled()
    expect(prismaMock.appUser.findFirst).not.toHaveBeenCalled()
  })

  it("redirects to the neutral sent page for an unknown email (no enumeration, no token, no mail)", async () => {
    prismaMock.appUser.findFirst.mockResolvedValue(null)

    await expect(forgotPassword(undefined, fd({ email: "ghost@example.com" }))).rejects.toThrow(
      "NEXT_REDIRECT:/forgot-password?sent=true",
    )

    expect(prismaMock.passwordResetToken.create).not.toHaveBeenCalled()
    expect(sendPasswordResetEmail).not.toHaveBeenCalled()
  })
})

// --- resetPassword -------------------------------------------------------
describe("resetPassword", () => {
  it("rejects an invalid/expired token without mutating the password", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue({
      appUserId: "user-1",
      userId: null,
      expiresAt: new Date(Date.now() - 1000), // expired
    })

    const res = await resetPassword(undefined, fd({ token: "tok", password: "Str0ng!Pass" }))

    expect(res).toEqual({ ok: false, message: "auth.invalidOrExpiredLink" })
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })
})

// --- changePassword (authz + business branches) --------------------------
describe("changePassword", () => {
  it("flags an incorrect current password as an inline field error and never writes", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue({ password: "STORED" })
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never) // currentPassword mismatch

    const res = await changePassword(undefined, fd({ currentPassword: "wrong", newPassword: "Str0ng!Pass" }))

    expect(res?.ok).toBe(false)
    expect(res?.message).toBe("common.invalidData")
    expect(res?.fieldErrors).toEqual({ currentPassword: ["auth.incorrectCurrentPassword"] })
    expect(prismaMock.appUser.update).not.toHaveBeenCalled()
  })

  it("returns done() on success after persisting the new hash", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue({ password: "STORED" })
    // first compare (current matches) → true; second compare (newPassword same?) → false
    vi.mocked(bcrypt.compare)
      .mockResolvedValueOnce(true as never)
      .mockResolvedValueOnce(false as never)
    prismaMock.appUser.update.mockResolvedValue({})

    const res = await changePassword(undefined, fd({ currentPassword: "Old!Pass1", newPassword: "Str0ng!Pass" }))

    expect(res).toEqual({ ok: true, message: "auth.passwordChanged" })
    expect(prismaMock.appUser.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-1" }, data: { password: "HASHED" } }),
    )
  })
})

// --- requestEmailChange (self-guard + dup) -------------------------------
describe("requestEmailChange", () => {
  it("rejects when the new email matches the current one (self-guard) and issues no token", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue({ email: "ada@example.com", password: "STORED" })

    const res = await requestEmailChange(
      undefined,
      fd({ newEmail: "ada@example.com", currentPassword: "Str0ng!Pass" }),
    )

    expect(res?.ok).toBe(false)
    expect(res?.message).toBe("common.invalidData")
    expect(res?.fieldErrors).toEqual({ newEmail: ["auth.emailMustDiffer"] })
    expect(prismaMock.emailToken.create).not.toHaveBeenCalled()
  })

  it("rejects when the target email is already taken by another account", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue({ email: "ada@example.com", password: "STORED" })
    prismaMock.appUser.findFirst.mockResolvedValue({ id: "someone-else" }) // email in use
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

    const res = await requestEmailChange(
      undefined,
      fd({ newEmail: "taken@example.com", currentPassword: "Str0ng!Pass" }),
    )

    expect(res?.ok).toBe(false)
    expect(res?.message).toBe("common.invalidData")
    expect(res?.fieldErrors).toEqual({ newEmail: ["auth.emailInUse"] })
    expect(prismaMock.emailToken.create).not.toHaveBeenCalled()
  })
})
