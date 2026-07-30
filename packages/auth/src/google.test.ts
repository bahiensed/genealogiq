import { describe, it, expect, vi, beforeEach } from "vitest"
import { resolveGoogleSignIn } from "./google"
import type { Profile } from "next-auth"

type Row = {
  id: string
  password: string | null
  isActive: boolean
  emailVerified: Date | null
  failedLoginAttempts: number
  lockedUntil: Date | null
  tenantId?: string | null
}

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

function baseProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    sub: "google-sub-1",
    email: "user@example.com",
    email_verified: true,
    name: "Test User",
    given_name: "Test",
    family_name: "User",
    ...overrides,
  }
}

function makeOpts(
  row: Row | null,
  googleOverrides: Partial<{
    allowSelfSignup: boolean
    createUserFromGoogleProfile: (profile: Profile) => Promise<Row>
    syncGoogleLink: (row: Row, profile: Profile) => Promise<unknown>
  }> = {},
  extraGate?: (row: Row) => boolean,
) {
  return {
    loadUserByEmail: vi.fn(async () => row),
    resetLockout: vi.fn(async () => ({})),
    extraGate,
    google: {
      clientId: "cid",
      clientSecret: "csecret",
      allowSelfSignup: false,
      syncGoogleLink: vi.fn(async () => ({})),
      ...googleOverrides,
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("resolveGoogleSignIn — profile gating", () => {
  it("rejects when the profile has no email", async () => {
    const opts = makeOpts(baseRow())
    expect(await resolveGoogleSignIn(baseProfile({ email: null }), opts)).toBeNull()
    expect(opts.loadUserByEmail).not.toHaveBeenCalled()
  })

  it("rejects an unverified Google email", async () => {
    const opts = makeOpts(baseRow())
    expect(await resolveGoogleSignIn(baseProfile({ email_verified: false }), opts)).toBeNull()
    expect(opts.loadUserByEmail).not.toHaveBeenCalled()
  })

  it("rejects a profile with no sub", async () => {
    const opts = makeOpts(baseRow())
    expect(await resolveGoogleSignIn(baseProfile({ sub: null }), opts)).toBeNull()
    expect(opts.loadUserByEmail).not.toHaveBeenCalled()
  })

  it("rejects an undefined profile (defensive — signIn's callback param is optional)", async () => {
    const opts = makeOpts(baseRow())
    expect(await resolveGoogleSignIn(undefined, opts)).toBeNull()
    expect(opts.loadUserByEmail).not.toHaveBeenCalled()
  })
})

describe("resolveGoogleSignIn — existing row (auto-link)", () => {
  it("looks up by lowercased email and links the existing row", async () => {
    const row = baseRow()
    const opts = makeOpts(row)
    const res = await resolveGoogleSignIn(baseProfile({ email: "User@Example.com" }), opts)
    expect(opts.loadUserByEmail).toHaveBeenCalledWith("user@example.com")
    expect(opts.google.syncGoogleLink).toHaveBeenCalledWith(row, expect.objectContaining({ email: "User@Example.com" }))
    expect(res).toBe(row)
  })

  it("does not block login when syncGoogleLink fails (bookkeeping only)", async () => {
    const row = baseRow()
    const opts = makeOpts(row, { syncGoogleLink: vi.fn(async () => { throw new Error("db down") }) })
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const res = await resolveGoogleSignIn(baseProfile(), opts)
    expect(res).toBe(row)
    errSpy.mockRestore()
  })

  it("does not require row.emailVerified to already be set — Google itself is the proof", async () => {
    const row = baseRow({ emailVerified: null })
    const opts = makeOpts(row)
    expect(await resolveGoogleSignIn(baseProfile(), opts)).toBe(row)
  })
})

describe("resolveGoogleSignIn — self-signup", () => {
  it("rejects an unmatched email when allowSelfSignup is false (BMS/SEQ: invite-only)", async () => {
    const opts = makeOpts(null, { allowSelfSignup: false })
    expect(await resolveGoogleSignIn(baseProfile(), opts)).toBeNull()
  })

  it("rejects an unmatched email when allowSelfSignup is true but no creator is wired", async () => {
    const opts = makeOpts(null, { allowSelfSignup: true })
    expect(await resolveGoogleSignIn(baseProfile(), opts)).toBeNull()
  })

  it("creates a new row from the Google profile when self-signup is allowed (APP)", async () => {
    const created = baseRow({ id: "new-u1" })
    const createFn = vi.fn(async () => created)
    const opts = makeOpts(null, { allowSelfSignup: true, createUserFromGoogleProfile: createFn })
    const res = await resolveGoogleSignIn(baseProfile(), opts)
    expect(createFn).toHaveBeenCalledWith(expect.objectContaining({ email: "user@example.com" }))
    expect(res).toBe(created)
  })

  it("recovers from a concurrent first-time signup race (TOCTOU) by re-resolving the winner's row", async () => {
    const race = baseRow({ id: "raced-in" })
    const loadUserByEmail = vi.fn()
      .mockResolvedValueOnce(null) // first lookup: no row yet
      .mockResolvedValueOnce(race) // retry after the create fails: the concurrent winner's row
    const opts = {
      loadUserByEmail,
      resetLockout: vi.fn(async () => ({})),
      google: {
        clientId: "cid",
        clientSecret: "csecret",
        allowSelfSignup: true,
        createUserFromGoogleProfile: vi.fn(async () => { throw new Error("unique constraint") }),
        syncGoogleLink: vi.fn(async () => ({})),
      },
    }
    const res = await resolveGoogleSignIn(baseProfile(), opts)
    expect(res).toBe(race)
    expect(loadUserByEmail).toHaveBeenCalledTimes(2)
  })

  it("re-throws the original creation error when the retry also finds nothing", async () => {
    const createErr = new Error("unique constraint")
    const opts = {
      loadUserByEmail: vi.fn(async () => null),
      resetLockout: vi.fn(async () => ({})),
      google: {
        clientId: "cid",
        clientSecret: "csecret",
        allowSelfSignup: true,
        createUserFromGoogleProfile: vi.fn(async () => { throw createErr }),
        syncGoogleLink: vi.fn(async () => ({})),
      },
    }
    await expect(resolveGoogleSignIn(baseProfile(), opts)).rejects.toBe(createErr)
  })
})

describe("resolveGoogleSignIn — post-resolution gates (parity with Credentials)", () => {
  it("rejects a deactivated user", async () => {
    const opts = makeOpts(baseRow({ isActive: false }))
    expect(await resolveGoogleSignIn(baseProfile(), opts)).toBeNull()
  })

  it("still syncs the Google link even when the row turns out inactive", async () => {
    const row = baseRow({ isActive: false })
    const opts = makeOpts(row)
    await resolveGoogleSignIn(baseProfile(), opts)
    expect(opts.google.syncGoogleLink).toHaveBeenCalled()
  })

  it("honors an extra gate (SEQ tenant requirement)", async () => {
    const noTenant = makeOpts(baseRow({ tenantId: null }), {}, (r) => !!r.tenantId)
    expect(await resolveGoogleSignIn(baseProfile(), noTenant)).toBeNull()

    const withTenant = makeOpts(baseRow({ tenantId: "t1" }), {}, (r) => !!r.tenantId)
    expect(await resolveGoogleSignIn(baseProfile(), withTenant)).not.toBeNull()
  })

  it("resets lockout state after a successful Google sign-in when attempts were recorded", async () => {
    const opts = makeOpts(baseRow({ failedLoginAttempts: 3 }))
    await resolveGoogleSignIn(baseProfile(), opts)
    expect(opts.resetLockout).toHaveBeenCalledWith("u1")
  })

  it("does not reset lockout when there was nothing to clear", async () => {
    const opts = makeOpts(baseRow({ failedLoginAttempts: 0, lockedUntil: null }))
    await resolveGoogleSignIn(baseProfile(), opts)
    expect(opts.resetLockout).not.toHaveBeenCalled()
  })

  it("is NOT blocked by an active Credentials lockout, and clears it — Google is a separate, stronger-proof channel", async () => {
    const opts = makeOpts(baseRow({ lockedUntil: new Date(Date.now() + 60_000) }))
    const res = await resolveGoogleSignIn(baseProfile(), opts)
    expect(res).not.toBeNull()
    expect(opts.resetLockout).toHaveBeenCalledWith("u1")
  })
})
