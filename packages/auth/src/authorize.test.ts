import { describe, it, expect, vi, beforeEach } from "vitest"

const { compareMock } = vi.hoisted(() => ({ compareMock: vi.fn() }))
vi.mock("bcryptjs", () => ({ default: { compare: compareMock } }))

import { authorizeUser } from "./authorize"

type Row = {
  id: string
  password: string | null
  isActive: boolean
  emailVerified: Date | null
  failedLoginAttempts: number
  lockedUntil: Date | null
  tenantId?: string | null
}

const VALID = { email: "user@example.com", password: "secret-pass" }

function baseRow(overrides: Partial<Row> = {}): Row {
  return {
    id: "u1",
    password: "hashed",
    isActive: true,
    emailVerified: new Date("2026-01-01"),
    failedLoginAttempts: 0,
    lockedUntil: null,
    tenantId: "t1",
    ...overrides,
  }
}

function makeOpts(row: Row | null, extraGate?: (row: Row) => boolean) {
  return {
    loadUserByEmail: vi.fn(async () => row),
    toPrincipal: (r: Row) => ({ id: r.id, email: VALID.email, name: "Test User", role: "OWNER" }),
    resetLockout: vi.fn(async () => ({})),
    extraGate,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  compareMock.mockResolvedValue(true)
})

describe("authorizeUser — canonical credential flow", () => {
  it("returns the principal on a valid login", async () => {
    const res = await authorizeUser(VALID, makeOpts(baseRow()))
    expect(res).toEqual({ id: "u1", email: VALID.email, name: "Test User", role: "OWNER" })
  })

  it("rejects an invalid credentials shape before hitting the DB", async () => {
    const opts = makeOpts(baseRow())
    const res = await authorizeUser({ email: "not-an-email", password: "" }, opts)
    expect(res).toBeNull()
    expect(opts.loadUserByEmail).not.toHaveBeenCalled()
  })

  it("rejects when the user does not exist", async () => {
    expect(await authorizeUser(VALID, makeOpts(null))).toBeNull()
  })

  it("rejects an unverified user", async () => {
    expect(await authorizeUser(VALID, makeOpts(baseRow({ emailVerified: null })))).toBeNull()
  })

  it("rejects a deactivated user", async () => {
    expect(await authorizeUser(VALID, makeOpts(baseRow({ isActive: false })))).toBeNull()
  })

  it("rejects a user who has not set a password (invited)", async () => {
    expect(await authorizeUser(VALID, makeOpts(baseRow({ password: null })))).toBeNull()
  })

  it("rejects a locked-out user WITHOUT checking the password (uniform lockout)", async () => {
    const opts = makeOpts(baseRow({ lockedUntil: new Date(Date.now() + 60_000) }))
    const res = await authorizeUser(VALID, opts)
    expect(res).toBeNull()
    expect(compareMock).not.toHaveBeenCalled()
  })

  it("allows once a stale lock has expired", async () => {
    const res = await authorizeUser(VALID, makeOpts(baseRow({ lockedUntil: new Date(Date.now() - 60_000) })))
    expect(res).not.toBeNull()
  })

  it("rejects a wrong password", async () => {
    compareMock.mockResolvedValue(false)
    expect(await authorizeUser(VALID, makeOpts(baseRow()))).toBeNull()
  })

  it("resets lockout state after a successful login when attempts were recorded", async () => {
    const opts = makeOpts(baseRow({ failedLoginAttempts: 3 }))
    await authorizeUser(VALID, opts)
    expect(opts.resetLockout).toHaveBeenCalledWith("u1")
  })

  it("does not reset lockout when there was nothing to clear", async () => {
    const opts = makeOpts(baseRow({ failedLoginAttempts: 0, lockedUntil: null }))
    await authorizeUser(VALID, opts)
    expect(opts.resetLockout).not.toHaveBeenCalled()
  })

  it("honors an extra gate (SEQ tenant requirement)", async () => {
    // a User with no tenantId is rejected by SEQ's extraGate even with a correct password
    const noTenant = makeOpts(baseRow({ tenantId: null }), (r) => !!r.tenantId)
    expect(await authorizeUser(VALID, noTenant)).toBeNull()

    const withTenant = makeOpts(baseRow({ tenantId: "t1" }), (r) => !!r.tenantId)
    expect(await authorizeUser(VALID, withTenant)).not.toBeNull()
  })
})
