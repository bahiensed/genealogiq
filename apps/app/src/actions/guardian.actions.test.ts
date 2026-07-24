import { describe, it, expect, vi, beforeEach } from "vitest"

// Prisma mock must be hoisted so it exists when the vi.mock factory runs.
const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    appUser: { findUnique: vi.fn() },
    appUserGuardian: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
// Identity translator: the localized message IS its key, so assertions read the key.
vi.mock("next-intl/server", () => ({ getTranslations: vi.fn(async () => (key: string) => key) }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/dal", () => ({ verifySession: vi.fn() }))
vi.mock("@/lib/notifications", () => ({ notify: vi.fn() }))
vi.mock("@genealogiq/services/rate-limit", () => ({ checkRateLimit: vi.fn() }))

import {
  requestGuardianship,
  approveGuardianship,
  rejectGuardianship,
} from "./guardian.actions"
import { verifySession } from "@/lib/dal"
import { notify } from "@/lib/notifications"
import { checkRateLimit } from "@genealogiq/services/rate-limit"

// cuid()-shaped ids so the .cuid() schema fields parse and we reach the guard.
const MGR = "cmgraaaaaaaaaaaaaaaaaaaaaa"
const GHOST_1 = "cghost1aaaaaaaaaaaaaaaaaaa"
const REAL_1 = "creal1aaaaaaaaaaaaaaaaaaaa"
const GSHIP_1 = "cgship1aaaaaaaaaaaaaaaaaaa"
const MISSING = "cmissingaaaaaaaaaaaaaaaaaa"

beforeEach(() => {
  vi.clearAllMocks()
  // Default: a logged-in user MGR.
  vi.mocked(verifySession).mockResolvedValue({ user: { id: MGR } } as never)
  vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, retryAfter: 0 })
})

describe("requestGuardianship", () => {
  it("rejects invalid input before touching the DB", async () => {
    const res = await requestGuardianship({ profileId: "" })

    expect(res.ok).toBe(false)
    if (res.ok) throw new Error("expected failure")
    // Zod cuid() issue message bubbles up via fail(parsed.error.issues[0].message).
    expect(typeof res.message).toBe("string")
    expect(prismaMock.appUser.findUnique).not.toHaveBeenCalled()
    expect(prismaMock.appUserGuardian.create).not.toHaveBeenCalled()
  })

  it("rejects when the rate limit is exceeded, before touching the DB", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, retryAfter: 30 })

    const res = await requestGuardianship({ profileId: GHOST_1 })

    expect(res).toEqual({ ok: false, message: "guardian.tooManyRequests" })
    expect(prismaMock.appUser.findUnique).not.toHaveBeenCalled()
  })

  it("self-guard: refuses to co-manage the caller's own profile (no DB read)", async () => {
    const res = await requestGuardianship({ profileId: MGR })

    expect(res).toEqual({ ok: false, message: "guardian.cannotManageOwn" })
    expect(prismaMock.appUser.findUnique).not.toHaveBeenCalled()
  })

  it("fails when the target profile does not exist", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue(null)

    const res = await requestGuardianship({ profileId: GHOST_1 })

    expect(res).toEqual({ ok: false, message: "guardian.profileNotFound" })
    expect(prismaMock.appUserGuardian.create).not.toHaveBeenCalled()
  })

  it("rejects co-management of a real APP_USER (ghosts/memorials only)", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue({
      id: REAL_1,
      role: "APP_USER",
      firstName: "A",
      lastName: "B",
      guardedBy: [],
    })

    const res = await requestGuardianship({ profileId: REAL_1 })

    expect(res).toEqual({ ok: false, message: "guardian.coManageUnsupported" })
    expect(prismaMock.appUserGuardian.create).not.toHaveBeenCalled()
  })

  it("rejects a duplicate request when caller already has a PENDING row", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue({
      id: GHOST_1,
      role: "APP_GHOST",
      firstName: "A",
      lastName: "B",
      guardedBy: [{ guardianId: MGR, status: "PENDING" }],
    })

    const res = await requestGuardianship({ profileId: GHOST_1 })

    expect(res).toEqual({ ok: false, message: "guardian.requestPending" })
    expect(prismaMock.appUserGuardian.create).not.toHaveBeenCalled()
  })

  it("creates a PENDING request for a ghost and notifies existing accepted guardians", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue({
      id: GHOST_1,
      role: "APP_GHOST",
      firstName: "A",
      lastName: "B",
      guardedBy: [{ guardianId: "owner-1", status: "ACCEPTED" }],
    })
    prismaMock.appUserGuardian.create.mockResolvedValue({ id: GSHIP_1 })

    const res = await requestGuardianship({ profileId: GHOST_1 })

    expect(res).toEqual({ ok: true, message: undefined })
    expect(prismaMock.appUserGuardian.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          appUserId: GHOST_1,
          guardianId: MGR,
          status: "PENDING",
          requestedById: MGR,
        }),
      }),
    )
    // The single accepted guardian gets a pending-request notification.
    expect(notify).toHaveBeenCalledTimes(1)
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: "GUARDIAN_REQUEST_PENDING", userId: "owner-1" }),
    )
  })
})

describe("approveGuardianship — co-management authz", () => {
  it("fails when the request does not exist", async () => {
    prismaMock.appUserGuardian.findUnique.mockResolvedValue(null)

    const res = await approveGuardianship({ guardianshipId: MISSING })

    expect(res).toEqual({ ok: false, message: "guardian.requestNotFound" })
    expect(prismaMock.appUserGuardian.update).not.toHaveBeenCalled()
  })

  it("rejects a caller who is not an accepted guardian of the profile", async () => {
    prismaMock.appUserGuardian.findUnique.mockResolvedValue({
      id: GSHIP_1,
      appUserId: GHOST_1,
      guardianId: "requester",
      status: "PENDING",
      // The caller MGR is NOT among the accepted guardians.
      appUser: { guardedBy: [{ guardianId: "someone-else", status: "ACCEPTED" }] },
    })

    const res = await approveGuardianship({ guardianshipId: GSHIP_1 })

    expect(res).toEqual({ ok: false, message: "guardian.notAuthorized" })
    expect(prismaMock.appUserGuardian.update).not.toHaveBeenCalled()
  })

  it("approves when the caller is an accepted guardian and notifies the requester", async () => {
    prismaMock.appUserGuardian.findUnique.mockResolvedValue({
      id: GSHIP_1,
      appUserId: GHOST_1,
      guardianId: "requester",
      status: "PENDING",
      appUser: { guardedBy: [{ guardianId: MGR, status: "ACCEPTED" }] },
    })
    prismaMock.appUserGuardian.update.mockResolvedValue({})

    const res = await approveGuardianship({ guardianshipId: GSHIP_1 })

    expect(res).toEqual({ ok: true, message: undefined })
    expect(prismaMock.appUserGuardian.update).toHaveBeenCalledWith({
      where: { id: GSHIP_1 },
      data: { status: "ACCEPTED" },
    })
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: "GUARDIAN_REQUEST_ACCEPTED", userId: "requester" }),
    )
  })
})

describe("rejectGuardianship — co-management authz", () => {
  it("fails when the request is already resolved (not PENDING)", async () => {
    prismaMock.appUserGuardian.findUnique.mockResolvedValue({
      id: GSHIP_1,
      appUserId: GHOST_1,
      guardianId: "requester",
      status: "ACCEPTED",
      requestedById: "requester",
      appUser: { guardedBy: [{ guardianId: MGR, status: "ACCEPTED" }] },
    })

    const res = await rejectGuardianship({ guardianshipId: GSHIP_1 })

    expect(res).toEqual({ ok: false, message: "guardian.requestResolved" })
    expect(prismaMock.appUserGuardian.delete).not.toHaveBeenCalled()
  })

  it("deletes the row and notifies the requester when an accepted guardian rejects", async () => {
    prismaMock.appUserGuardian.findUnique.mockResolvedValue({
      id: GSHIP_1,
      appUserId: GHOST_1,
      guardianId: "requester",
      status: "PENDING",
      requestedById: "requester",
      appUser: { guardedBy: [{ guardianId: MGR, status: "ACCEPTED" }] },
    })
    prismaMock.appUserGuardian.delete.mockResolvedValue({})

    const res = await rejectGuardianship({ guardianshipId: GSHIP_1 })

    expect(res).toEqual({ ok: true, message: undefined })
    expect(prismaMock.appUserGuardian.delete).toHaveBeenCalledWith({ where: { id: GSHIP_1 } })
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: "GUARDIAN_REQUEST_REJECTED", userId: "requester" }),
    )
  })

  it("lets the original requester withdraw their own still-pending request, though they aren't an accepted guardian", async () => {
    prismaMock.appUserGuardian.findUnique.mockResolvedValue({
      id: GSHIP_1,
      appUserId: GHOST_1,
      guardianId: MGR,
      status: "PENDING",
      requestedById: MGR,
      appUser: { guardedBy: [{ guardianId: "someone-else", status: "ACCEPTED" }] },
    })
    prismaMock.appUserGuardian.delete.mockResolvedValue({})

    const res = await rejectGuardianship({ guardianshipId: GSHIP_1 })

    expect(res).toEqual({ ok: true, message: undefined })
    expect(prismaMock.appUserGuardian.delete).toHaveBeenCalledWith({ where: { id: GSHIP_1 } })
  })

  it("does not notify the requester about their own self-withdrawal", async () => {
    prismaMock.appUserGuardian.findUnique.mockResolvedValue({
      id: GSHIP_1,
      appUserId: GHOST_1,
      guardianId: MGR,
      status: "PENDING",
      requestedById: MGR,
      appUser: { guardedBy: [] },
    })
    prismaMock.appUserGuardian.delete.mockResolvedValue({})

    await rejectGuardianship({ guardianshipId: GSHIP_1 })

    expect(notify).not.toHaveBeenCalled()
  })

  it("still rejects a caller who is neither an accepted guardian nor the original requester", async () => {
    prismaMock.appUserGuardian.findUnique.mockResolvedValue({
      id: GSHIP_1,
      appUserId: GHOST_1,
      guardianId: "requester",
      status: "PENDING",
      requestedById: "requester",
      appUser: { guardedBy: [{ guardianId: "someone-else", status: "ACCEPTED" }] },
    })

    const res = await rejectGuardianship({ guardianshipId: GSHIP_1 })

    expect(res).toEqual({ ok: false, message: "guardian.notAuthorized" })
    expect(prismaMock.appUserGuardian.delete).not.toHaveBeenCalled()
  })
})
