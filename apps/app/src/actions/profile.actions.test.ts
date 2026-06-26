import { describe, it, expect, vi, beforeEach } from "vitest"

// Prisma mock must be hoisted so it exists when the vi.mock factory runs.
const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    appUser: { findUnique: vi.fn(), update: vi.fn() },
    address: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
// Identity translator: the returned "message" is the translation KEY.
vi.mock("next-intl/server", () => ({ getTranslations: vi.fn(async () => (key: string) => key) }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/dal", () => ({ verifySession: vi.fn() }))
vi.mock("@/lib/blob", () => ({ deleteBlobs: vi.fn() }))

import { updateProfile } from "./profile.actions"
import { verifySession } from "@/lib/dal"
import { deleteBlobs } from "@/lib/blob"

// Minimal payload that passes getProfileEditSchema (firstName/lastName required,
// address object present but all fields nullish).
const validInput = (overrides: Record<string, unknown> = {}) => ({
  firstName: "Ada",
  lastName: "Lovelace",
  address: {},
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  // Self-scoped: the only identity that matters is the live session user.
  vi.mocked(verifySession).mockResolvedValue({ user: { id: "self" } } as never)
  prismaMock.appUser.findUnique.mockResolvedValue({ avatarUrl: null, addressId: null })
  prismaMock.appUser.update.mockResolvedValue({})
})

describe("updateProfile — input validation", () => {
  it("rejects invalid input before touching the DB (missing firstName fails zod)", async () => {
    const res = await updateProfile(validInput({ firstName: "" }))

    expect(res).toEqual({ ok: false, message: "common.invalidData" })
    expect(prismaMock.appUser.update).not.toHaveBeenCalled()
    expect(prismaMock.appUser.findUnique).not.toHaveBeenCalled()
  })

  it("rejects a non-object payload before touching the DB", async () => {
    const res = await updateProfile(null)

    expect(res).toEqual({ ok: false, message: "common.invalidData" })
    expect(prismaMock.appUser.update).not.toHaveBeenCalled()
  })

  it("rejects an invalid avatar url (not a URL) before touching the DB", async () => {
    const res = await updateProfile(validInput({ avatarUrl: "not-a-url" }))

    expect(res).toEqual({ ok: false, message: "common.invalidData" })
    expect(prismaMock.appUser.update).not.toHaveBeenCalled()
  })

  it("rejects a well-formed but off-site avatar url (host pin, not just URL shape)", async () => {
    const res = await updateProfile(validInput({ avatarUrl: "https://evil.example.com/pixel.png" }))

    expect(res).toEqual({ ok: false, message: "common.invalidData" })
    expect(prismaMock.appUser.update).not.toHaveBeenCalled()
  })
})

describe("updateProfile — self-scoping (living users)", () => {
  it("writes to the SESSION user id, never an id smuggled in via the payload", async () => {
    // Even if the client forges an `id`, the action ignores it (not in the schema)
    // and scopes the update to session.user.id.
    const res = await updateProfile(validInput({ id: "victim", userId: "victim" }))

    expect(res).toEqual({ ok: true, message: undefined })
    expect(prismaMock.appUser.update).toHaveBeenCalledTimes(1)
    expect(prismaMock.appUser.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "self" } }),
    )
    expect(prismaMock.appUser.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "self" } }),
    )
  })

  it("never persists death fields for a living user (they are stripped from the write)", async () => {
    const res = await updateProfile(
      validInput({
        deathDate: "2020-01-01",
        deathPlace: "Nowhere",
        deathState: "NA",
        deathCountry: "NA",
        deathCause: "redacted",
      }),
    )

    expect(res.ok).toBe(true)
    const writeArg = prismaMock.appUser.update.mock.calls[0][0]
    const data = writeArg.data
    expect(data).not.toHaveProperty("deathDate")
    expect(data).not.toHaveProperty("deathPlace")
    expect(data).not.toHaveProperty("deathState")
    expect(data).not.toHaveProperty("deathCountry")
    expect(data).not.toHaveProperty("deathCause")
  })
})

describe("updateProfile — avatar blob pruning", () => {
  it("deletes the stale avatar blob when the avatar changes", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue({
      avatarUrl: "https://qa.public.blob.vercel-storage.com/old.jpg",
      addressId: null,
    })

    const res = await updateProfile(validInput({ avatarUrl: "https://qa.public.blob.vercel-storage.com/new.jpg" }))

    expect(res.ok).toBe(true)
    expect(deleteBlobs).toHaveBeenCalledWith(["https://qa.public.blob.vercel-storage.com/old.jpg"])
  })

  it("does not delete the blob when the avatar is unchanged", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue({
      avatarUrl: "https://qa.public.blob.vercel-storage.com/same.jpg",
      addressId: null,
    })

    const res = await updateProfile(validInput({ avatarUrl: "https://qa.public.blob.vercel-storage.com/same.jpg" }))

    expect(res.ok).toBe(true)
    expect(deleteBlobs).not.toHaveBeenCalled()
  })
})

describe("updateProfile — address upsert + happy path", () => {
  it("creates a new address when fields are provided and links it to the user", async () => {
    prismaMock.address.create.mockResolvedValue({ id: "addr-1" })

    const res = await updateProfile(validInput({ address: { city: "London", street: "Baker St" } }))

    expect(res).toEqual({ ok: true, message: undefined })
    expect(prismaMock.address.create).toHaveBeenCalledTimes(1)
    expect(prismaMock.appUser.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ addressId: "addr-1" }) }),
    )
  })

  it("returns ok with no addressId when the address payload is empty (best-effort cleanup)", async () => {
    // No existing address, empty payload -> no create, addressId null.
    const res = await updateProfile(validInput({ address: {} }))

    expect(res).toEqual({ ok: true, message: undefined })
    expect(prismaMock.address.create).not.toHaveBeenCalled()
    expect(prismaMock.appUser.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ addressId: null }) }),
    )
  })
})
