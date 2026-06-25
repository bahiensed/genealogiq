import { describe, it, expect, vi, beforeEach } from "vitest"

// Prisma mock must be hoisted so it exists when the vi.mock factory runs.
const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    galleryItem: { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
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

import { saveGallery, deleteGallery } from "./gallery"
import { verifySession } from "@/lib/dal"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { deleteBlobs } from "@/lib/blob"
import { getMemorialFeatures } from "@/lib/subscription"

// A valid image item that satisfies mediaItemSchema (url must be a real URL).
const img = (n: number) => ({
  id: `i${n}`,
  kind: "image" as const,
  url: `https://blob.example.com/img-${n}.jpg`,
  order: n,
})
const vid = (n: number) => ({
  id: `v${n}`,
  kind: "video" as const,
  url: `https://blob.example.com/vid-${n}.mp4`,
  order: n,
})

beforeEach(() => {
  vi.clearAllMocks()
  // Default: a logged-in user who manages profile "A" with generous quota.
  vi.mocked(verifySession).mockResolvedValue({ user: { id: "mgr" } } as never)
  vi.mocked(getProfileById).mockResolvedValue({ id: "A", guardedBy: [] } as never)
  vi.mocked(canManageProfile).mockReturnValue(true)
  vi.mocked(getMemorialFeatures).mockResolvedValue({
    galleryMaxImages: 10,
    galleryMaxVideos: 3,
  } as never)
  prismaMock.galleryItem.findMany.mockResolvedValue([])
  prismaMock.galleryItem.deleteMany.mockResolvedValue({})
  prismaMock.galleryItem.createMany.mockResolvedValue({})
})

describe("saveGallery — ownership guard", () => {
  it("rejects when the profile does not exist (never touches the DB)", async () => {
    vi.mocked(getProfileById).mockResolvedValue(null as never)

    const res = await saveGallery("A", { items: [img(0)] })

    expect(res).toEqual({ ok: false, message: "gallery.notAuthorized" })
    expect(prismaMock.galleryItem.deleteMany).not.toHaveBeenCalled()
    expect(prismaMock.galleryItem.createMany).not.toHaveBeenCalled()
  })

  it("rejects when the caller cannot manage the profile (never touches the DB)", async () => {
    vi.mocked(canManageProfile).mockReturnValue(false)

    const res = await saveGallery("A", { items: [img(0)] })

    expect(res).toEqual({ ok: false, message: "gallery.notAuthorized" })
    expect(getMemorialFeatures).not.toHaveBeenCalled()
    expect(prismaMock.galleryItem.deleteMany).not.toHaveBeenCalled()
  })
})

describe("saveGallery — input validation", () => {
  it("rejects malformed input before quota check or any DB write", async () => {
    // `url` is not a valid URL → mediaItemSchema fails.
    const res = await saveGallery("A", { items: [{ kind: "image", url: "not-a-url", order: 0 }] })

    expect(res).toEqual({ ok: false, message: "common.invalidData" })
    expect(getMemorialFeatures).not.toHaveBeenCalled()
    expect(prismaMock.galleryItem.createMany).not.toHaveBeenCalled()
  })
})

describe("saveGallery — max-count quota", () => {
  it("rejects when image count exceeds galleryMaxImages (no DB write)", async () => {
    vi.mocked(getMemorialFeatures).mockResolvedValue({
      galleryMaxImages: 2,
      galleryMaxVideos: 3,
    } as never)

    const res = await saveGallery("A", { items: [img(0), img(1), img(2)] })

    expect(res).toEqual({ ok: false, message: "gallery.imageLimit" })
    expect(prismaMock.galleryItem.deleteMany).not.toHaveBeenCalled()
    expect(prismaMock.galleryItem.createMany).not.toHaveBeenCalled()
  })

  it("rejects when video count exceeds galleryMaxVideos (no DB write)", async () => {
    vi.mocked(getMemorialFeatures).mockResolvedValue({
      galleryMaxImages: 10,
      galleryMaxVideos: 1,
    } as never)

    const res = await saveGallery("A", { items: [vid(0), vid(1)] })

    expect(res).toEqual({ ok: false, message: "gallery.videoLimit" })
    expect(prismaMock.galleryItem.createMany).not.toHaveBeenCalled()
  })
})

describe("saveGallery — reorder/replace happy path", () => {
  it("deletes orphaned blobs, replaces rows in order, and returns done()", async () => {
    // Existing rows: one stays (img-0), one is removed (old).
    prismaMock.galleryItem.findMany.mockResolvedValue([
      { url: "https://blob.example.com/img-0.jpg" },
      { url: "https://blob.example.com/old.jpg" },
    ])

    // Reordered set: img(1) first, img(0) second.
    const res = await saveGallery("A", { items: [img(1), img(0)] })

    expect(res).toEqual({ ok: true, message: undefined })
    // Only the blob no longer referenced is deleted.
    expect(deleteBlobs).toHaveBeenCalledWith(["https://blob.example.com/old.jpg"])
    expect(prismaMock.galleryItem.deleteMany).toHaveBeenCalledWith({ where: { userId: "A" } })
    // `order` is re-derived from array index, proving the reorder is persisted.
    expect(prismaMock.galleryItem.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({ id: "i1", order: 0, userId: "A" }),
          expect.objectContaining({ id: "i0", order: 1, userId: "A" }),
        ],
      }),
    )
  })

  it("clears the gallery (empty items) without calling createMany", async () => {
    prismaMock.galleryItem.findMany.mockResolvedValue([
      { url: "https://blob.example.com/img-0.jpg" },
    ])

    const res = await saveGallery("A", { items: [] })

    expect(res).toEqual({ ok: true, message: undefined })
    expect(deleteBlobs).toHaveBeenCalledWith(["https://blob.example.com/img-0.jpg"])
    expect(prismaMock.galleryItem.deleteMany).toHaveBeenCalledWith({ where: { userId: "A" } })
    expect(prismaMock.galleryItem.createMany).not.toHaveBeenCalled()
  })
})

describe("deleteGallery — ownership guard", () => {
  it("rejects when the caller cannot manage the profile (never touches the DB)", async () => {
    vi.mocked(canManageProfile).mockReturnValue(false)

    const res = await deleteGallery("A")

    expect(res).toEqual({ ok: false, message: "gallery.notAuthorized" })
    expect(prismaMock.galleryItem.deleteMany).not.toHaveBeenCalled()
    expect(deleteBlobs).not.toHaveBeenCalled()
  })

  it("removes all blobs and rows then returns done()", async () => {
    prismaMock.galleryItem.findMany.mockResolvedValue([
      { url: "https://blob.example.com/img-0.jpg" },
      { url: "https://blob.example.com/img-1.jpg" },
    ])

    const res = await deleteGallery("A")

    expect(res).toEqual({ ok: true, message: undefined })
    expect(deleteBlobs).toHaveBeenCalledWith([
      "https://blob.example.com/img-0.jpg",
      "https://blob.example.com/img-1.jpg",
    ])
    expect(prismaMock.galleryItem.deleteMany).toHaveBeenCalledWith({ where: { userId: "A" } })
  })
})
