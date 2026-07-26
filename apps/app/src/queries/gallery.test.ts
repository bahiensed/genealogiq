import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { galleryItem: { findMany: vi.fn() } },
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

import { getGalleryByUserId } from "./gallery"

const ITEM = {
  id: "g1",
  kind: "image",
  url: "https://x/y.jpg",
  poster: null,
  durationSec: null,
  takenAt: "2020-01-01",
  location: "Rio",
  description: "A day at the beach",
  order: 0,
}

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.galleryItem.findMany.mockResolvedValue([{ ...ITEM }])
})

describe("getGalleryByUserId", () => {
  it("returns full metadata by default", async () => {
    const [item] = await getGalleryByUserId("owner")
    expect(item.takenAt).toBe("2020-01-01")
    expect(item.location).toBe("Rio")
    expect(item.description).toBe("A day at the beach")
  })

  it("nulls takenAt/location/description when redactMetaForAnon is true", async () => {
    const [item] = await getGalleryByUserId("owner", 12, true)
    expect(item.takenAt).toBeNull()
    expect(item.location).toBeNull()
    expect(item.description).toBeNull()
    // url/id/kind still present — only metadata the gated lightbox would show is redacted
    expect(item.url).toBe("https://x/y.jpg")
  })
})
