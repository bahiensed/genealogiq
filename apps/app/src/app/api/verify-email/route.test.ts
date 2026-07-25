import { describe, it, expect, vi, beforeEach } from "vitest"
import { hashToken } from "@genealogiq/core"

// next-auth/jwt is mocked (not real) because merely importing it in this
// project's vitest/pnpm layout drags in next-auth's own internal
// next-auth/lib/env.js, which fails to resolve `next/server` in that context
// — an environment/module-resolution issue, not something in this route's
// logic. The fake below still round-trips the REAL payload and embeds
// secret/salt so the test catches this route passing either wrong (salt in
// particular must equal the cookie name — see route.ts's own comment).
vi.mock("next-auth/jwt", () => ({
  encode: vi.fn(async ({ token, secret, salt }: { token: unknown; secret: string; salt: string }) =>
    JSON.stringify({ token, secret, salt })),
  decode: vi.fn(async ({ token, secret, salt }: { token: string; secret: string; salt: string }) => {
    const parsed = JSON.parse(token)
    if (parsed.secret !== secret || parsed.salt !== salt) return null
    return parsed.token
  }),
}))

// NextResponse.redirect()/cookies.set() are real (not mocked) — thin wrappers
// over the standard Request/Response Web APIs available natively in this
// project's Node runtime, and using the real thing is a stronger test of the
// actual redirect/cookie mechanics than hand-rolling a fake.

// @/auth and @genealogiq/auth (the package root, packages/auth/src/node.ts)
// are also mocked (not real): both modules have a real (non-type-only)
// top-level `import NextAuth from "next-auth"` — merely importing them at
// all, for ANY named export, runs that import and hits the exact same
// next/server resolution issue as above. Both fakes below reproduce the real
// (trivial, stable) logic verbatim rather than importing it — see
// apps/app/src/auth.ts's toPrincipal and packages/auth/src/node.ts's
// buildSessionToken. @genealogiq/auth/edge (packages/auth/src/edge.ts) is
// fine to import for real — its `next-auth` import is type-only, erased.
vi.mock("@/auth", () => ({
  toPrincipal: (u: { id: string; email: string | null; firstName: string; lastName: string; role: string }) => ({
    id: u.id, email: u.email ?? "", name: `${u.firstName} ${u.lastName}`, role: u.role,
  }),
}))
vi.mock("@genealogiq/auth", () => ({
  buildSessionToken: (p: { id: string; email: string; name: string; role: string; image?: string | null; customerId?: string }) => ({
    name: p.name, email: p.email, sub: p.id, id: p.id, role: p.role, image: p.image ?? null,
    ...(p.customerId !== undefined ? { customerId: p.customerId } : {}),
  }),
}))

const { prismaMock, rateLimitMock } = vi.hoisted(() => ({
  prismaMock: {
    emailToken: { findUnique: vi.fn(), delete: vi.fn() },
    appUser: { update: vi.fn(), findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
  rateLimitMock: {
    getClientIp: vi.fn(),
    checkRateLimit: vi.fn(),
  },
}))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/rate-limit", () => rateLimitMock)

import { GET } from "./route"
import { decode } from "next-auth/jwt"

// @genealogiq/core's hashToken and @/auth.config's authConfig are pure/no-I/O
// — used for real, not mocked, so the tests exercise the actual
// payload-building and cookie-config wiring.

const SELECT_USER = { id: "user-1", email: "ada@example.com", firstName: "Ada", lastName: "Lovelace", role: "APP_USER" }

function makeReq(url: string) {
  return { nextUrl: new URL(url), url } as never
}

type Res = Awaited<ReturnType<typeof GET>>

beforeEach(() => {
  vi.clearAllMocks()
  process.env.AUTH_SECRET = "test-secret-at-least-32-chars-long!!"
  rateLimitMock.getClientIp.mockResolvedValue("1.2.3.4")
  rateLimitMock.checkRateLimit.mockResolvedValue({ allowed: true, retryAfter: 0 })
  prismaMock.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops))
})

describe("GET /api/verify-email", () => {
  it("bounces to the plain page when no token is present", async () => {
    const res = (await GET(makeReq("https://app.example.com/api/verify-email"))) as unknown as Res
    expect(res.headers.get("location")).toBe("https://app.example.com/verify-email")
    expect(prismaMock.emailToken.findUnique).not.toHaveBeenCalled()
  })

  it("bounces to the page (with the token) when the token doesn't exist", async () => {
    prismaMock.emailToken.findUnique.mockResolvedValue(null)
    const res = (await GET(makeReq("https://app.example.com/api/verify-email?token=abc123"))) as unknown as Res
    expect(res.headers.get("location")).toBe("https://app.example.com/verify-email?token=abc123")
    expect(prismaMock.appUser.update).not.toHaveBeenCalled()
  })

  it("bounces to the page when the token is expired", async () => {
    prismaMock.emailToken.findUnique.mockResolvedValue({
      type: "VERIFICATION", appUserId: "user-1", expiresAt: new Date(Date.now() - 1000),
    })
    const res = (await GET(makeReq("https://app.example.com/api/verify-email?token=abc123"))) as unknown as Res
    expect(res.headers.get("location")).toContain("/verify-email?token=abc123")
    expect(prismaMock.appUser.update).not.toHaveBeenCalled()
  })

  it("bounces to the page for a CHANGE-type token instead of auto-logging in", async () => {
    prismaMock.emailToken.findUnique.mockResolvedValue({
      type: "CHANGE", appUserId: "user-1", expiresAt: new Date(Date.now() + 1000 * 60),
    })
    const res = (await GET(makeReq("https://app.example.com/api/verify-email?token=abc123"))) as unknown as Res
    expect(res.headers.get("location")).toContain("/verify-email?token=abc123")
    expect(prismaMock.appUser.update).not.toHaveBeenCalled()
  })

  it("bounces to the page (token intact) when rate-limited, without touching the DB", async () => {
    rateLimitMock.checkRateLimit.mockResolvedValue({ allowed: false, retryAfter: 120 })
    const res = (await GET(makeReq("https://app.example.com/api/verify-email?token=abc123&callbackUrl=%2Fqr%2FXYZ"))) as unknown as Res
    expect(res.headers.get("location")).toBe("https://app.example.com/verify-email?token=abc123&callbackUrl=%2Fqr%2FXYZ")
    expect(prismaMock.emailToken.findUnique).not.toHaveBeenCalled()
  })

  it("verifies, mints a real session cookie, and redirects home on a valid VERIFICATION token", async () => {
    prismaMock.emailToken.findUnique.mockResolvedValue({
      type: "VERIFICATION", appUserId: "user-1", expiresAt: new Date(Date.now() + 1000 * 60),
    })
    prismaMock.appUser.update.mockResolvedValue(SELECT_USER)
    prismaMock.emailToken.delete.mockResolvedValue({})

    const res = (await GET(makeReq("https://app.example.com/api/verify-email?token=abc123"))) as unknown as Res

    expect(res.headers.get("location")).toBe("https://app.example.com/home")
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)

    const cookieName = "app.session-token"
    const cookie = res.cookies.get(cookieName)
    expect(cookie?.value).toBeTruthy()
    const setCookieHeader = res.headers.get("set-cookie")
    expect(setCookieHeader).toContain("HttpOnly")
    expect(setCookieHeader).toContain("SameSite=lax")
    expect(setCookieHeader).toContain("Path=/")
    expect(setCookieHeader).toContain("Secure")

    // Round-trip: the minted cookie must decode back into exactly what a real
    // login's JWT payload would be for this user — not just "a cookie got set".
    const payload = await decode({ token: cookie!.value, secret: process.env.AUTH_SECRET!, salt: cookieName })
    expect(payload).toMatchObject({
      id: "user-1", sub: "user-1", role: "APP_USER", email: "ada@example.com", name: "Ada Lovelace", image: null,
    })
  })

  it("redirects to callbackUrl instead of /home when one was carried through", async () => {
    prismaMock.emailToken.findUnique.mockResolvedValue({
      type: "VERIFICATION", appUserId: "user-1", expiresAt: new Date(Date.now() + 1000 * 60),
    })
    prismaMock.appUser.update.mockResolvedValue(SELECT_USER)
    prismaMock.emailToken.delete.mockResolvedValue({})

    const res = (await GET(makeReq("https://app.example.com/api/verify-email?token=abc123&callbackUrl=%2Fqr%2FXYZ"))) as unknown as Res

    expect(res.headers.get("location")).toBe("https://app.example.com/qr/XYZ")
  })

  it("logs in anyway when a concurrent double-click already consumed the token but the account is verified", async () => {
    prismaMock.emailToken.findUnique.mockResolvedValue({
      type: "VERIFICATION", appUserId: "user-1", expiresAt: new Date(Date.now() + 1000 * 60),
    })
    prismaMock.$transaction.mockRejectedValue(new Error("token already deleted"))
    prismaMock.appUser.findUnique.mockResolvedValue({ ...SELECT_USER, emailVerified: new Date() })

    const res = (await GET(makeReq("https://app.example.com/api/verify-email?token=abc123"))) as unknown as Res

    expect(res.headers.get("location")).toBe("https://app.example.com/home")
    expect(res.cookies.get("app.session-token")?.value).toBeTruthy()
  })

  it("bounces to the page on a genuine transaction failure where the account never got verified", async () => {
    prismaMock.emailToken.findUnique.mockResolvedValue({
      type: "VERIFICATION", appUserId: "user-1", expiresAt: new Date(Date.now() + 1000 * 60),
    })
    prismaMock.$transaction.mockRejectedValue(new Error("db down"))
    prismaMock.appUser.findUnique.mockResolvedValue({ ...SELECT_USER, emailVerified: null })

    const res = (await GET(makeReq("https://app.example.com/api/verify-email?token=abc123"))) as unknown as Res

    expect(res.headers.get("location")).toContain("/verify-email?token=abc123")
    expect(res.cookies.get("app.session-token")).toBeUndefined()
  })

  it("hashes the token before looking it up (never queries by the raw emailed token)", async () => {
    prismaMock.emailToken.findUnique.mockResolvedValue(null)
    await GET(makeReq("https://app.example.com/api/verify-email?token=raw-token-value"))
    expect(prismaMock.emailToken.findUnique).toHaveBeenCalledWith({ where: { token: hashToken("raw-token-value") } })
  })
})
