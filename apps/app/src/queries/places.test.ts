import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { geoPlace: { findMany: vi.fn(), findFirst: vi.fn() } },
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

import { getPlaceById } from "./places"

const ALL_IDS = ["p1", "p2", "p3"]

beforeEach(() => {
  vi.clearAllMocks()
  // Mirrors getPlacesByUserId's own ordering — take limits how many ids come back.
  prismaMock.geoPlace.findMany.mockImplementation(({ take }: { take?: number }) =>
    Promise.resolve(ALL_IDS.slice(0, take).map((id) => ({ id }))),
  )
  prismaMock.geoPlace.findFirst.mockImplementation(({ where }: { where: { id: string } }) =>
    Promise.resolve(ALL_IDS.includes(where.id) ? { id: where.id } : null),
  )
})

describe("getPlaceById", () => {
  it("resolves any place when no anon limit is passed (authenticated viewer)", async () => {
    const place = await getPlaceById("owner", "p3")
    expect(place).toEqual({ id: "p3" })
  })

  it("resolves a place within the anon-visible slice", async () => {
    const place = await getPlaceById("owner", "p2", 2)
    expect(place).toEqual({ id: "p2" })
  })

  it("returns null for a place past the anon-visible slice", async () => {
    const place = await getPlaceById("owner", "p3", 2)
    expect(place).toBeNull()
    expect(prismaMock.geoPlace.findFirst).not.toHaveBeenCalled()
  })

  it("returns null for a place that doesn't exist at all, same as past the limit", async () => {
    const place = await getPlaceById("owner", "nope", 2)
    expect(place).toBeNull()
  })
})
