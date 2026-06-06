import { describe, it, expect } from "vitest"
import { canManageProfile, type Manageable } from "./profile"

// Helper to build a Manageable profile with sensible defaults.
const profile = (over: Partial<Manageable> = {}): Manageable => ({
  id: "profile-1",
  guardedBy: [],
  ...over,
})

describe("canManageProfile", () => {
  it("allows the profile owner", () => {
    expect(canManageProfile(profile({ id: "u1" }), "u1")).toBe(true)
  })

  it("allows an ACCEPTED guardian", () => {
    const p = profile({ guardedBy: [{ guardianId: "g1", status: "ACCEPTED" }] })
    expect(canManageProfile(p, "g1")).toBe(true)
  })

  // Regression guard for the A2 hardening: anyone can create a PENDING
  // guardianship request, so PENDING must never grant management rights.
  it("denies a PENDING guardian", () => {
    const p = profile({ guardedBy: [{ guardianId: "g1", status: "PENDING" }] })
    expect(canManageProfile(p, "g1")).toBe(false)
  })

  it("denies a REJECTED guardian", () => {
    const p = profile({ guardedBy: [{ guardianId: "g1", status: "REJECTED" }] })
    expect(canManageProfile(p, "g1")).toBe(false)
  })

  // Callers that pre-filter guardedBy to ACCEPTED rows omit the status field;
  // those entries must still grant access.
  it("allows a guardian whose status is omitted (pre-filtered caller)", () => {
    const p = profile({ guardedBy: [{ guardianId: "g1" }] })
    expect(canManageProfile(p, "g1")).toBe(true)
  })

  it("denies a user who is neither owner nor guardian", () => {
    const p = profile({ id: "u1", guardedBy: [{ guardianId: "g1", status: "ACCEPTED" }] })
    expect(canManageProfile(p, "intruder")).toBe(false)
  })

  it("denies when there are no guardians and the user is not the owner", () => {
    expect(canManageProfile(profile({ id: "u1" }), "u2")).toBe(false)
  })

  it("matches the correct guardian among several", () => {
    const p = profile({
      guardedBy: [
        { guardianId: "g1", status: "ACCEPTED" },
        { guardianId: "g2", status: "PENDING" },
      ],
    })
    expect(canManageProfile(p, "g1")).toBe(true)
    expect(canManageProfile(p, "g2")).toBe(false)
  })
})
