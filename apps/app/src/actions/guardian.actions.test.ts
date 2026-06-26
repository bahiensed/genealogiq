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

import {
  requestGuardianship,
  approveGuardianship,
  rejectGuardianship,
} from "./guardian.actions"
import { verifySession } from "@/lib/dal"
import { notify } from "@/lib/notifications"

beforeEach(() => {
  vi.clearAllMocks()
  // Default: a logged-in user "mgr".
  vi.mocked(verifySession).mockResolvedValue({ user: { id: "mgr" } } as never)
})

describe("requestGuardianship", () => {
  it("rejects invalid input before touching the DB", async () => {
    const res = await requestGuardianship({ profileId: "" })

    expect(res.ok).toBe(false)
    if (res.ok) throw new Error("expected failure")
    // Zod min(1) issue message bubbles up via fail(parsed.error.issues[0].message).
    expect(typeof res.message).toBe("string")
    expect(prismaMock.appUser.findUnique).not.toHaveBeenCalled()
    expect(prismaMock.appUserGuardian.create).not.toHaveBeenCalled()
  })

  it("self-guard: refuses to co-manage the caller's own profile (no DB read)", async () => {
    const res = await requestGuardianship({ profileId: "mgr" })

    expect(res).toEqual({ ok: false, message: "guardian.cannotManageOwn" })
    expect(prismaMock.appUser.findUnique).not.toHaveBeenCalled()
  })

  it("fails when the target profile does not exist", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue(null)

    const res = await requestGuardianship({ profileId: "ghost-1" })

    expect(res).toEqual({ ok: false, message: "guardian.profileNotFound" })
    expect(prismaMock.appUserGuardian.create).not.toHaveBeenCalled()
  })

  it("rejects co-management of a real APP_USER (ghosts/memorials only)", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue({
      id: "real-1",
      role: "APP_USER",
      firstName: "A",
      lastName: "B",
      guardedBy: [],
    })

    const res = await requestGuardianship({ profileId: "real-1" })

    expect(res).toEqual({ ok: false, message: "guardian.coManageUnsupported" })
    expect(prismaMock.appUserGuardian.create).not.toHaveBeenCalled()
  })

  it("rejects a duplicate request when caller already has a PENDING row", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue({
      id: "ghost-1",
      role: "APP_GHOST",
      firstName: "A",
      lastName: "B",
      guardedBy: [{ guardianId: "mgr", status: "PENDING" }],
    })

    const res = await requestGuardianship({ profileId: "ghost-1" })

    expect(res).toEqual({ ok: false, message: "guardian.requestPending" })
    expect(prismaMock.appUserGuardian.create).not.toHaveBeenCalled()
  })

  it("creates a PENDING request for a ghost and notifies existing accepted guardians", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue({
      id: "ghost-1",
      role: "APP_GHOST",
      firstName: "A",
      lastName: "B",
      guardedBy: [{ guardianId: "owner-1", status: "ACCEPTED" }],
    })
    prismaMock.appUserGuardian.create.mockResolvedValue({ id: "gship-1" })

    const res = await requestGuardianship({ profileId: "ghost-1" })

    expect(res).toEqual({ ok: true, message: undefined })
    expect(prismaMock.appUserGuardian.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          appUserId: "ghost-1",
          guardianId: "mgr",
          status: "PENDING",
          requestedById: "mgr",
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

    const res = await approveGuardianship({ guardianshipId: "missing" })

    expect(res).toEqual({ ok: false, message: "guardian.requestNotFound" })
    expect(prismaMock.appUserGuardian.update).not.toHaveBeenCalled()
  })

  it("rejects a caller who is not an accepted guardian of the profile", async () => {
    prismaMock.appUserGuardian.findUnique.mockResolvedValue({
      id: "gship-1",
      appUserId: "ghost-1",
      guardianId: "requester",
      status: "PENDING",
      // The caller "mgr" is NOT among the accepted guardians.
      appUser: { guardedBy: [{ guardianId: "someone-else", status: "ACCEPTED" }] },
    })

    const res = await approveGuardianship({ guardianshipId: "gship-1" })

    expect(res).toEqual({ ok: false, message: "guardian.notAuthorized" })
    expect(prismaMock.appUserGuardian.update).not.toHaveBeenCalled()
  })

  it("approves when the caller is an accepted guardian and notifies the requester", async () => {
    prismaMock.appUserGuardian.findUnique.mockResolvedValue({
      id: "gship-1",
      appUserId: "ghost-1",
      guardianId: "requester",
      status: "PENDING",
      appUser: { guardedBy: [{ guardianId: "mgr", status: "ACCEPTED" }] },
    })
    prismaMock.appUserGuardian.update.mockResolvedValue({})

    const res = await approveGuardianship({ guardianshipId: "gship-1" })

    expect(res).toEqual({ ok: true, message: undefined })
    expect(prismaMock.appUserGuardian.update).toHaveBeenCalledWith({
      where: { id: "gship-1" },
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
      id: "gship-1",
      appUserId: "ghost-1",
      guardianId: "requester",
      status: "ACCEPTED",
      appUser: { guardedBy: [{ guardianId: "mgr", status: "ACCEPTED" }] },
    })

    const res = await rejectGuardianship({ guardianshipId: "gship-1" })

    expect(res).toEqual({ ok: false, message: "guardian.requestResolved" })
    expect(prismaMock.appUserGuardian.delete).not.toHaveBeenCalled()
  })

  it("deletes the row and notifies the requester when an accepted guardian rejects", async () => {
    prismaMock.appUserGuardian.findUnique.mockResolvedValue({
      id: "gship-1",
      appUserId: "ghost-1",
      guardianId: "requester",
      status: "PENDING",
      appUser: { guardedBy: [{ guardianId: "mgr", status: "ACCEPTED" }] },
    })
    prismaMock.appUserGuardian.delete.mockResolvedValue({})

    const res = await rejectGuardianship({ guardianshipId: "gship-1" })

    expect(res).toEqual({ ok: true, message: undefined })
    expect(prismaMock.appUserGuardian.delete).toHaveBeenCalledWith({ where: { id: "gship-1" } })
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: "GUARDIAN_REQUEST_REJECTED", userId: "requester" }),
    )
  })
})
