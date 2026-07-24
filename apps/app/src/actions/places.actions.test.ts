import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    geoPlace: {
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next-intl/server", () => ({ getTranslations: vi.fn(async () => (key: string) => key) }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/dal", () => ({ verifySession: vi.fn() }))
vi.mock("@/queries/profile", () => ({ getProfileById: vi.fn() }))
vi.mock("@/lib/profile", () => ({ canManageProfile: vi.fn() }))
vi.mock("@/lib/blob", () => ({ deleteBlobs: vi.fn() }))
vi.mock("@/lib/subscription", () => ({ getMemorialFeatures: vi.fn() }))

import { savePlace, deletePlace } from "./places.actions"
import { verifySession } from "@/lib/dal"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { getMemorialFeatures } from "@/lib/subscription"
import { deleteBlobs } from "@/lib/blob"

const validData = {
  title: "Home",
  description: "",
  categories: ["birth"],
  address: { country: "BR" },
  lat: -22.9,
  lon: -43.1,
  photos: [] as string[],
  startDate: null,
  endDate: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifySession).mockResolvedValue({ user: { id: "mgr" } } as never)
  vi.mocked(getProfileById).mockResolvedValue({ id: "A", guardedBy: [] } as never)
  vi.mocked(canManageProfile).mockReturnValue(true)
  vi.mocked(getMemorialFeatures).mockResolvedValue({ geoPlacesMax: 3 } as never)
  prismaMock.geoPlace.count.mockResolvedValue(0)
})

afterEach(() => {
  delete process.env.GEO_PLACES_ENFORCE_QUOTA
})

describe("savePlace — guards", () => {
  it("rejects when the profile does not exist", async () => {
    vi.mocked(getProfileById).mockResolvedValue(null as never)
    const res = await savePlace("A", null, validData)
    expect(res).toEqual({ ok: false, message: "places.notAuthorized" })
    expect(prismaMock.geoPlace.create).not.toHaveBeenCalled()
  })

  it("rejects a caller who cannot manage the profile", async () => {
    vi.mocked(canManageProfile).mockReturnValue(false)
    const res = await savePlace("A", null, validData)
    expect(res).toEqual({ ok: false, message: "places.notAuthorized" })
    expect(prismaMock.geoPlace.create).not.toHaveBeenCalled()
  })

  it("rejects invalid input before writing", async () => {
    const res = await savePlace("A", null, { ...validData, categories: ["nope"] })
    expect(res).toEqual({ ok: false, message: "common.invalidData" })
    expect(prismaMock.geoPlace.create).not.toHaveBeenCalled()
  })
})

describe("savePlace — quota (gated by GEO_PLACES_ENFORCE_QUOTA)", () => {
  it("blocks creation at/over the limit when the flag is enabled", async () => {
    process.env.GEO_PLACES_ENFORCE_QUOTA = "true"
    prismaMock.geoPlace.count.mockResolvedValue(3)
    const res = await savePlace("A", null, validData)
    expect(res).toEqual({ ok: false, message: "places.limitReached" })
    expect(prismaMock.geoPlace.create).not.toHaveBeenCalled()
  })

  it("does NOT block when the flag is absent, even over the limit (dev default)", async () => {
    prismaMock.geoPlace.count.mockResolvedValue(99)
    prismaMock.geoPlace.create.mockResolvedValue({ id: "p1" })
    const res = await savePlace("A", null, validData)
    expect(res).toEqual({ ok: true, message: undefined })
    expect(prismaMock.geoPlace.create).toHaveBeenCalled()
  })
})

describe("savePlace — create/update happy paths", () => {
  it("creates a place with order equal to the current count", async () => {
    prismaMock.geoPlace.count.mockResolvedValue(2)
    prismaMock.geoPlace.create.mockResolvedValue({ id: "p1" })
    const res = await savePlace("A", null, validData)
    expect(res).toEqual({ ok: true, message: undefined })
    expect(prismaMock.geoPlace.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "A", order: 2 }) }),
    )
  })

  it("fails to update a place that does not belong to the profile", async () => {
    prismaMock.geoPlace.findFirst.mockResolvedValue(null)
    const res = await savePlace("A", "missing", validData)
    expect(res).toEqual({ ok: false, message: "places.notFound" })
    expect(prismaMock.geoPlace.update).not.toHaveBeenCalled()
  })

  it("updates an existing place and prunes stale photo blobs", async () => {
    prismaMock.geoPlace.findFirst.mockResolvedValue({
      photos: [
        "https://qa.public.blob.vercel-storage.com/keep.jpg",
        "https://qa.public.blob.vercel-storage.com/stale.jpg",
      ],
    })
    prismaMock.geoPlace.update.mockResolvedValue({ id: "p1" })
    const res = await savePlace("A", "p1", {
      ...validData,
      photos: ["https://qa.public.blob.vercel-storage.com/keep.jpg"],
    })
    expect(res).toEqual({ ok: true, message: undefined })
    expect(deleteBlobs).toHaveBeenCalledWith(["https://qa.public.blob.vercel-storage.com/stale.jpg"])
    expect(prismaMock.geoPlace.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "p1" } }),
    )
  })
})

describe("deletePlace", () => {
  it("rejects a caller who cannot manage the profile", async () => {
    vi.mocked(canManageProfile).mockReturnValue(false)
    const res = await deletePlace("A", "p1")
    expect(res).toEqual({ ok: false, message: "places.notAuthorized" })
    expect(prismaMock.geoPlace.delete).not.toHaveBeenCalled()
  })

  it("deletes the place and its blobs on the happy path", async () => {
    prismaMock.geoPlace.findFirst.mockResolvedValue({
      photos: ["https://qa.public.blob.vercel-storage.com/x.jpg"],
    })
    prismaMock.geoPlace.delete.mockResolvedValue({})
    const res = await deletePlace("A", "p1")
    expect(res).toEqual({ ok: true, message: undefined })
    expect(deleteBlobs).toHaveBeenCalledWith(["https://qa.public.blob.vercel-storage.com/x.jpg"])
    expect(prismaMock.geoPlace.delete).toHaveBeenCalledWith({ where: { id: "p1" } })
  })
})
