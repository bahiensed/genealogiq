import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    familyRelation: { findMany: vi.fn() },
    appUser: { findMany: vi.fn() },
  },
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

import { getTreeMemberIds, getFamilyTree } from "./family-tree"

type Rel = { id: string; fromId: string; toId: string; status: string }

// Drives prismaMock.familyRelation.findMany to honour the real query shape:
// where.status is "ACCEPTED" (traversal) or { not: "REJECTED" } (render fetch),
// and where.OR = [{ fromId: { in: frontier } }, { toId: { in: frontier } }].
function mockRelations(all: Rel[]) {
  prismaMock.familyRelation.findMany.mockImplementation(
    ({ where }: { where: { status: unknown; OR: Array<{ fromId?: { in: string[] }; toId?: { in: string[] } }> } }) => {
      const frontier = where.OR[0].fromId!.in
      const statusOk = (r: Rel) =>
        where.status === "ACCEPTED" ? r.status === "ACCEPTED" : r.status !== "REJECTED"
      return Promise.resolve(
        all
          .filter((r) => statusOk(r) && (frontier.includes(r.fromId) || frontier.includes(r.toId)))
          .map((r) => ({
            id: r.id, type: "SIBLING", subtype: null,
            fromId: r.fromId, toId: r.toId,
            startDate: null, endDate: null,
            status: r.status, requestedById: null,
          })),
      )
    },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.appUser.findMany.mockImplementation(({ where }: { where: { id: { in: string[] } } }) =>
    Promise.resolve(
      where.id.in.map((id) => ({
        id, firstName: "f", lastName: "l", maidenName: null, nickname: null,
        gender: null, avatarUrl: null, birthDate: null, birthPlace: null, birthCountry: null,
        deathDate: null, deathPlace: null, deathCountry: null, role: "APP_USER",
      })),
    ),
  )
})

// Tree: ROOT —ACCEPTED— G(host); ROOT —PENDING— S(tranger); S —ACCEPTED— SP (S's own subtree).
const TREE: Rel[] = [
  { id: "r1", fromId: "ROOT", toId: "G",  status: "ACCEPTED" },
  { id: "r2", fromId: "ROOT", toId: "S",  status: "PENDING" },
  { id: "r3", fromId: "S",    toId: "SP", status: "ACCEPTED" },
]

describe("getTreeMemberIds — ACCEPTED-only membership", () => {
  it("excludes a pending invitee (and their subtree) from the membership set", async () => {
    mockRelations(TREE)

    const ids = await getTreeMemberIds("ROOT")

    expect(ids).toEqual(new Set(["ROOT", "G"])) // S (pending) and SP (S's subtree) are NOT members
  })
})

describe("getFamilyTree — pending invite is a boundary, not a window into the invitee's tree", () => {
  it("renders the pending invitee's node but not their subtree", async () => {
    mockRelations(TREE)

    const tree = await getFamilyTree("ROOT")

    // ROOT + accepted member G + the pending invitee S (as a leaf), but NOT SP.
    expect(Object.keys(tree.persons).sort()).toEqual(["G", "ROOT", "S"])
    expect(tree.persons.SP).toBeUndefined()
    expect(tree.persons.S.pending).toBe(true)
    // The accepted edge + the boundary pending invite show; S's internal edge does not.
    expect(tree.relations.map((r) => r.id).sort()).toEqual(["r1", "r2"])
  })
})
