import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    galleryItem: { groupBy: vi.fn() },
    bioImage:    { count: vi.fn() },
    geoPlace:    { findMany: vi.fn() },
  },
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

import { getCombinedMediaUsage } from "./media-usage"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getCombinedMediaUsage", () => {
  it("sums images across gallery, bio and geo places, videos from gallery only", async () => {
    prismaMock.galleryItem.groupBy.mockResolvedValue([
      { kind: "image", _count: { _all: 5 } },
      { kind: "video", _count: { _all: 3 } },
    ])
    prismaMock.bioImage.count.mockResolvedValue(2)
    prismaMock.geoPlace.findMany.mockResolvedValue([
      { photos: ["a", "b"] },
      { photos: ["c"] },
    ])

    const usage = await getCombinedMediaUsage("user1")

    expect(usage).toEqual({ images: 5 + 2 + 3, videos: 3 })
  })

  it("returns zeros when nothing exists in any source", async () => {
    prismaMock.galleryItem.groupBy.mockResolvedValue([])
    prismaMock.bioImage.count.mockResolvedValue(0)
    prismaMock.geoPlace.findMany.mockResolvedValue([])

    const usage = await getCombinedMediaUsage("user1")

    expect(usage).toEqual({ images: 0, videos: 0 })
  })

  it("handles a profile with only videos and no images", async () => {
    prismaMock.galleryItem.groupBy.mockResolvedValue([{ kind: "video", _count: { _all: 4 } }])
    prismaMock.bioImage.count.mockResolvedValue(0)
    prismaMock.geoPlace.findMany.mockResolvedValue([])

    const usage = await getCombinedMediaUsage("user1")

    expect(usage).toEqual({ images: 0, videos: 4 })
  })

  it("sums photo array lengths across multiple places", async () => {
    prismaMock.galleryItem.groupBy.mockResolvedValue([])
    prismaMock.bioImage.count.mockResolvedValue(0)
    prismaMock.geoPlace.findMany.mockResolvedValue([
      { photos: ["a", "b", "c"] },
      { photos: [] },
      { photos: ["d"] },
    ])

    const usage = await getCombinedMediaUsage("user1")

    expect(usage.images).toBe(4)
  })
})
