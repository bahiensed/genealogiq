import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { favorite: { findMany: vi.fn() } },
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

import { getFavoritesByUserId } from "./favorite"

function fav(target: Partial<Record<string, unknown>> & { id: string }) {
  return {
    targetId: target.id,
    target: {
      firstName: "f",
      lastName: "l",
      avatarUrl: null,
      role: "APP_USER",
      isPublicProfile: true,
      birthDate: new Date("1990-05-15T00:00:00.000Z"),
      birthPlace: "Rio",
      birthState: "RJ",
      birthCountry: "BR",
      deathDate: null,
      deathPlace: null,
      deathState: null,
      deathCountry: null,
      deathCause: null,
      ...target,
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getFavoritesByUserId", () => {
  it("redacts a favorited living stranger's exact dates for any viewer, including the list owner", async () => {
    prismaMock.favorite.findMany.mockResolvedValue([fav({ id: "OTHER" })])

    const rows = await getFavoritesByUserId("OWNER", "OWNER")

    expect(rows[0].target.birthDate).toBeNull()
    expect(rows[0].target.birthPlace).toBeNull()
    expect(rows[0].target.birthYear).toBe(1990)
  })

  it("does not redact a favorited memorial, regardless of viewer", async () => {
    prismaMock.favorite.findMany.mockResolvedValue([fav({ id: "MEMO", role: "APP_MEMO" })])

    const rows = await getFavoritesByUserId("OWNER", undefined)

    expect(rows[0].target.birthDate).not.toBeNull()
    expect(rows[0].target.birthPlace).toBe("Rio")
  })

  it("drops an opted-out living target for an anonymous viewer", async () => {
    prismaMock.favorite.findMany.mockResolvedValue([
      fav({ id: "PUBLIC", isPublicProfile: true }),
      fav({ id: "PRIVATE", isPublicProfile: false }),
    ])

    const rows = await getFavoritesByUserId("OWNER", undefined)

    expect(rows.map((r) => r.targetId)).toEqual(["PUBLIC"])
  })

  it("keeps an opted-out living target for any authenticated viewer", async () => {
    prismaMock.favorite.findMany.mockResolvedValue([fav({ id: "PRIVATE", isPublicProfile: false })])

    const rows = await getFavoritesByUserId("OWNER", "some-logged-in-user")

    expect(rows.map((r) => r.targetId)).toEqual(["PRIVATE"])
  })

  it("never drops a memorial for an anonymous viewer", async () => {
    prismaMock.favorite.findMany.mockResolvedValue([fav({ id: "MEMO", role: "APP_MEMO", isPublicProfile: false })])

    const rows = await getFavoritesByUserId("OWNER", undefined)

    expect(rows.map((r) => r.targetId)).toEqual(["MEMO"])
  })
})
