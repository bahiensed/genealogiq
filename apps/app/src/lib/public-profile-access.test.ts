import { describe, it, expect, vi } from "vitest"

// redirect/notFound throw in real Next; emulate that so we can assert on the
// thrown sentinel, matching the pattern in actions/auth.actions.test.ts.
class RedirectError extends Error {
  constructor(public url: string) { super(`NEXT_REDIRECT:${url}`) }
}
class NotFoundError extends Error {
  constructor() { super("NEXT_NOT_FOUND") }
}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => { throw new RedirectError(url) },
  notFound: () => { throw new NotFoundError() },
}))

import { assertPublicMemorialAccess } from "./public-profile-access"

interface Profile { role: string; isPublicProfile: boolean }

const profile = (over: Partial<Profile> = {}): Profile => ({
  role: "APP_USER",
  isPublicProfile: true,
  ...over,
})

describe("assertPublicMemorialAccess — anonymous viewer", () => {
  it("allows a memorial regardless of isPublicProfile", () => {
    expect(() => assertPublicMemorialAccess(profile({ role: "APP_MEMO", isPublicProfile: false }), undefined, "p1"))
      .not.toThrow()
  })

  it("allows a pet regardless of isPublicProfile", () => {
    expect(() => assertPublicMemorialAccess(profile({ role: "APP_PET", isPublicProfile: false }), undefined, "p1"))
      .not.toThrow()
  })

  it("allows a living user who has not opted out", () => {
    expect(() => assertPublicMemorialAccess(profile({ role: "APP_USER", isPublicProfile: true }), undefined, "p1"))
      .not.toThrow()
  })

  it("redirects away from a living user who opted out", () => {
    expect(() => assertPublicMemorialAccess(profile({ role: "APP_USER", isPublicProfile: false }), undefined, "p1"))
      .toThrow(/^NEXT_REDIRECT:\/sign-in/)
  })

  // Regression guard: a naive `role !== "APP_MEMO"` gate would let this
  // through. Ghosts have no login/session, so nobody could ever opt them
  // back out — this case must always redirect regardless of isPublicProfile.
  it("NEVER allows a ghost, even with isPublicProfile true", () => {
    expect(() => assertPublicMemorialAccess(profile({ role: "APP_GHOST", isPublicProfile: true }), undefined, "p1"))
      .toThrow(/^NEXT_REDIRECT:\/sign-in/)
  })

  it("redirects on a missing profile", () => {
    expect(() => assertPublicMemorialAccess(null, undefined, "p1")).toThrow(/^NEXT_REDIRECT:\/sign-in/)
  })

  it("encodes the callback URL back to the profile being viewed", () => {
    expect(() => assertPublicMemorialAccess(null, undefined, "p1"))
      .toThrow("NEXT_REDIRECT:/sign-in?callbackUrl=%2Fprofile%2Fp1")
  })
})

describe("assertPublicMemorialAccess — authenticated viewer", () => {
  // Pre-existing, out-of-scope-for-this-ticket behavior: any session bypasses
  // the anonymous gate entirely, for every role. Documented here so a future
  // change to this either happens on purpose or breaks a test that says why.
  it("allows a memorial", () => {
    expect(() => assertPublicMemorialAccess(profile({ role: "APP_MEMO" }), "viewer-1", "p1")).not.toThrow()
  })

  it("allows a living user even if they opted out", () => {
    expect(() => assertPublicMemorialAccess(profile({ role: "APP_USER", isPublicProfile: false }), "viewer-1", "p1"))
      .not.toThrow()
  })

  it("allows a ghost", () => {
    expect(() => assertPublicMemorialAccess(profile({ role: "APP_GHOST" }), "viewer-1", "p1")).not.toThrow()
  })

  it("404s on a missing profile instead of redirecting", () => {
    expect(() => assertPublicMemorialAccess(null, "viewer-1", "p1")).toThrow("NEXT_NOT_FOUND")
  })
})
