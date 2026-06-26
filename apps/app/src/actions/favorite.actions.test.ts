import { describe, it, expect, vi, beforeEach } from "vitest"

// Prisma mock must be hoisted so it exists when the vi.mock factory runs.
const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    favorite: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
  },
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next-intl/server", () => ({ getTranslations: vi.fn(async () => (key: string) => key) }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/dal", () => ({ verifySession: vi.fn() }))

import { toggleFavorite } from "./favorite.actions"
import { verifySession } from "@/lib/dal"
import { revalidatePath } from "next/cache"

beforeEach(() => {
  vi.clearAllMocks()
  // Default: a logged-in user "me".
  vi.mocked(verifySession).mockResolvedValue({ user: { id: "me" } } as never)
})

describe("toggleFavorite — self-favorite guard", () => {
  it("rejects favoriting yourself and never touches the DB", async () => {
    const res = await toggleFavorite("me")

    // identity translator -> message is the key
    expect(res).toEqual({ ok: false, message: "favorite.cannotFavoriteSelf" })
    expect(prismaMock.favorite.findUnique).not.toHaveBeenCalled()
    expect(prismaMock.favorite.create).not.toHaveBeenCalled()
    expect(prismaMock.favorite.delete).not.toHaveBeenCalled()
  })
})

describe("toggleFavorite — add branch", () => {
  it("creates a favorite when none exists and returns favorited: true", async () => {
    prismaMock.favorite.findUnique.mockResolvedValue(null)
    prismaMock.favorite.create.mockResolvedValue({})

    const res = await toggleFavorite("target")

    expect(res.ok).toBe(true)
    expect(res).toEqual({ ok: true, data: { favorited: true }, message: undefined })
    expect(prismaMock.favorite.create).toHaveBeenCalledWith({
      data: { userId: "me", targetId: "target" },
    })
    expect(prismaMock.favorite.delete).not.toHaveBeenCalled()
  })
})

describe("toggleFavorite — remove branch", () => {
  it("deletes the favorite when one exists and returns favorited: false", async () => {
    prismaMock.favorite.findUnique.mockResolvedValue({ userId: "me" })
    prismaMock.favorite.delete.mockResolvedValue({})

    const res = await toggleFavorite("target")

    expect(res.ok).toBe(true)
    expect(res).toEqual({ ok: true, data: { favorited: false }, message: undefined })
    expect(prismaMock.favorite.delete).toHaveBeenCalledWith({
      where: { userId_targetId: { userId: "me", targetId: "target" } },
    })
    expect(prismaMock.favorite.create).not.toHaveBeenCalled()
  })
})

describe("toggleFavorite — revalidation", () => {
  it("revalidates both the target profile and the viewer's favorites list", async () => {
    prismaMock.favorite.findUnique.mockResolvedValue(null)
    prismaMock.favorite.create.mockResolvedValue({})

    await toggleFavorite("target")

    expect(revalidatePath).toHaveBeenCalledWith("/profile/target")
    expect(revalidatePath).toHaveBeenCalledWith("/profile/me/favorites")
  })
})
