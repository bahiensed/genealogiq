import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    familyRelation: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    appUser: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/dal", () => ({ verifySession: vi.fn() }))
vi.mock("@/queries/profile", () => ({ getProfileById: vi.fn() }))
vi.mock("@/lib/profile", () => ({ canManageProfile: vi.fn() }))
vi.mock("@/lib/subscription", () => ({ getMemorialFeatures: vi.fn() }))
vi.mock("@/lib/notifications", () => ({ notify: vi.fn() }))
vi.mock("@/queries/family-tree", () => ({
  getTreeMemberIds: vi.fn(),
  countTreeMembers: vi.fn(),
}))

import { updateRelation, updateMember } from "./family-tree"
import { verifySession } from "@/lib/dal"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { getTreeMemberIds } from "@/queries/family-tree"

beforeEach(() => {
  vi.clearAllMocks()
  // Caller manages the tree root "A".
  vi.mocked(verifySession).mockResolvedValue({ user: { id: "mgr" } } as never)
  vi.mocked(getProfileById).mockResolvedValue({ id: "A", guardedBy: [] } as never)
  vi.mocked(canManageProfile).mockReturnValue(true)
  vi.mocked(getTreeMemberIds).mockResolvedValue(new Set(["A"]))
})

describe("updateRelation — C2 IDOR guard", () => {
  it("rejects a relation whose endpoints are outside root's tree and never updates", async () => {
    prismaMock.familyRelation.findUnique.mockResolvedValue({ fromId: "X", toId: "Y" })
    vi.mocked(getTreeMemberIds).mockResolvedValue(new Set(["A"])) // tree does NOT contain X/Y

    const res = await updateRelation("A", "rel-1", {})

    expect(res).toEqual({ error: "Not authorized." })
    expect(prismaMock.familyRelation.update).not.toHaveBeenCalled()
  })

  it("updates a relation whose endpoints are inside root's tree", async () => {
    prismaMock.familyRelation.findUnique.mockResolvedValue({ fromId: "X", toId: "Y" })
    vi.mocked(getTreeMemberIds).mockResolvedValue(new Set(["A", "X", "Y"]))
    prismaMock.familyRelation.update.mockResolvedValue({})

    const res = await updateRelation("A", "rel-1", { subtype: "married" })

    expect(res).toEqual({ success: true })
    expect(prismaMock.familyRelation.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "rel-1" } }),
    )
  })
})

describe("updateMember — C3 IDOR guard (ghost branch)", () => {
  it("rejects editing a ghost that does not belong to root's tree", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue({ id: "ghost-1", role: "APP_GHOST" })
    vi.mocked(getTreeMemberIds).mockResolvedValue(new Set(["A"])) // ghost not reachable

    const res = await updateMember("A", "ghost-1", { firstName: "John", lastName: "Doe" })

    expect(res).toEqual({ error: "Not authorized." })
    expect(prismaMock.appUser.update).not.toHaveBeenCalled()
  })

  it("updates a ghost that belongs to root's tree", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue({ id: "ghost-1", role: "APP_GHOST" })
    vi.mocked(getTreeMemberIds).mockResolvedValue(new Set(["A", "ghost-1"]))
    prismaMock.appUser.update.mockResolvedValue({})

    const res = await updateMember("A", "ghost-1", { firstName: "John", lastName: "Doe" })

    expect(res).toEqual({ success: true })
    expect(prismaMock.appUser.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "ghost-1" } }),
    )
  })
})
