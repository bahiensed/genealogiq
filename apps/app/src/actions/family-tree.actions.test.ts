import { describe, it, expect, vi, beforeEach } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    familyRelation: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    appUser: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    appUserGuardian: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next-intl/server", () => ({ getTranslations: vi.fn(async () => (key: string) => key) }))
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

import { addRelation, addGhostRelative, updateRelation, removeRelation, updateMember } from "./family-tree.actions"
import { verifySession } from "@/lib/dal"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { notify } from "@/lib/notifications"
import { getTreeMemberIds, countTreeMembers } from "@/queries/family-tree"
import { getMemorialFeatures } from "@/lib/subscription"

beforeEach(() => {
  vi.clearAllMocks()
  // Caller manages the tree root "A".
  vi.mocked(verifySession).mockResolvedValue({ user: { id: "mgr" } } as never)
  vi.mocked(getProfileById).mockResolvedValue({ id: "A", guardedBy: [] } as never)
  vi.mocked(canManageProfile).mockReturnValue(true)
  vi.mocked(getTreeMemberIds).mockResolvedValue(new Set(["A"]))
  vi.mocked(getMemorialFeatures).mockResolvedValue({ treeMaxMembers: 50 } as never)
  vi.mocked(countTreeMembers).mockResolvedValue(1)
})

// cuid()-shaped ids so the .cuid() schema fields parse and we reach the guard.
const ROOT = "crootaaaaaaaa"
const MEMBER = "cmemberaaaaaa"
const STRANGER1 = "cstrangeronea"
const STRANGER2 = "cstrangertwoa"
const FOREIGN_MEMO = "cforeignmemoa"

function mockUsers(byId: Record<string, { id: string; role: string }>) {
  prismaMock.appUser.findUnique.mockImplementation(
    ({ where }: { where: { id: string } }) => Promise.resolve(byId[where.id] ?? null),
  )
}

describe("updateRelation — C2 IDOR guard", () => {
  it("rejects a relation whose endpoints are outside root's tree and never updates", async () => {
    prismaMock.familyRelation.findUnique.mockResolvedValue({ fromId: "X", toId: "Y" })
    vi.mocked(getTreeMemberIds).mockResolvedValue(new Set(["A"])) // tree does NOT contain X/Y

    const res = await updateRelation("A", "rel-1", {})

    expect(res).toEqual({ ok: false, message: "familyTree.notAuthorized" })
    expect(prismaMock.familyRelation.update).not.toHaveBeenCalled()
  })

  it("updates a relation whose endpoints are inside root's tree", async () => {
    prismaMock.familyRelation.findUnique.mockResolvedValue({ fromId: "X", toId: "Y" })
    vi.mocked(getTreeMemberIds).mockResolvedValue(new Set(["A", "X", "Y"]))
    prismaMock.familyRelation.update.mockResolvedValue({})

    const res = await updateRelation("A", "rel-1", { subtype: "married" })

    expect(res).toEqual({ ok: true, message: undefined })
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

    expect(res).toEqual({ ok: false, message: "familyTree.notAuthorized" })
    expect(prismaMock.appUser.update).not.toHaveBeenCalled()
  })

  it("updates a ghost that belongs to root's tree", async () => {
    prismaMock.appUser.findUnique.mockResolvedValue({ id: "ghost-1", role: "APP_GHOST" })
    vi.mocked(getTreeMemberIds).mockResolvedValue(new Set(["A", "ghost-1"]))
    prismaMock.appUser.update.mockResolvedValue({})

    const res = await updateMember("A", "ghost-1", { firstName: "John", lastName: "Doe" })

    expect(res).toEqual({ ok: true, message: undefined })
    expect(prismaMock.appUser.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "ghost-1" } }),
    )
  })
})

describe("addRelation — IDOR guard", () => {
  it("rejects a relation between two profiles outside root's tree (stranger↔stranger) and never creates", async () => {
    mockUsers({
      [STRANGER1]: { id: STRANGER1, role: "APP_USER" },
      [STRANGER2]: { id: STRANGER2, role: "APP_USER" },
    })
    vi.mocked(getTreeMemberIds).mockResolvedValue(new Set([ROOT])) // neither endpoint in the tree

    const res = await addRelation(ROOT, { fromId: STRANGER1, toId: STRANGER2, type: "SIBLING" })

    expect(res).toEqual({ ok: false, message: "familyTree.notAuthorized" })
    expect(prismaMock.familyRelation.create).not.toHaveBeenCalled()
  })

  it("rejects attaching a foreign ghost/memorial to root (no consent gate protects it)", async () => {
    mockUsers({
      [ROOT]: { id: ROOT, role: "APP_USER" },
      [FOREIGN_MEMO]: { id: FOREIGN_MEMO, role: "APP_MEMO" },
    })
    vi.mocked(getTreeMemberIds).mockResolvedValue(new Set([ROOT])) // memo not reachable from root

    const res = await addRelation(ROOT, { fromId: ROOT, toId: FOREIGN_MEMO, type: "PARENT_OF" })

    expect(res).toEqual({ ok: false, message: "familyTree.notAuthorized" })
    expect(prismaMock.familyRelation.create).not.toHaveBeenCalled()
  })

  it("allows linking two members already in root's tree", async () => {
    mockUsers({
      [ROOT]: { id: ROOT, role: "APP_USER" },
      [MEMBER]: { id: MEMBER, role: "APP_GHOST" },
    })
    vi.mocked(getTreeMemberIds).mockResolvedValue(new Set([ROOT, MEMBER]))
    prismaMock.familyRelation.findFirst.mockResolvedValue({ id: "rel-existing" })
    prismaMock.familyRelation.create.mockResolvedValue({ id: "rel-new" })

    const res = await addRelation(ROOT, { fromId: ROOT, toId: MEMBER, type: "SPOUSE" })

    expect(res).toEqual({ ok: true, message: undefined })
    expect(prismaMock.familyRelation.create).toHaveBeenCalled()
  })

  it("rejects a foreign linkSpouseId (forged spouse via the link side-channel)", async () => {
    mockUsers({
      [ROOT]: { id: ROOT, role: "APP_USER" },
      [MEMBER]: { id: MEMBER, role: "APP_GHOST" },
    })
    vi.mocked(getTreeMemberIds).mockResolvedValue(new Set([ROOT, MEMBER])) // STRANGER1 not in tree

    const res = await addRelation(ROOT, {
      fromId: ROOT, toId: MEMBER, type: "PARENT_OF", linkSpouseId: STRANGER1,
    })

    expect(res).toEqual({ ok: false, message: "familyTree.notAuthorized" })
    expect(prismaMock.familyRelation.create).not.toHaveBeenCalled()
  })

  it("forces consent (PENDING) for an out-of-tree APP_USER even when anchored to a non-root member", async () => {
    mockUsers({
      [MEMBER]: { id: MEMBER, role: "APP_GHOST" },     // in-tree anchor (not root)
      [STRANGER1]: { id: STRANGER1, role: "APP_USER" }, // out-of-tree real user
    })
    vi.mocked(getTreeMemberIds).mockResolvedValue(new Set([ROOT, MEMBER]))
    prismaMock.familyRelation.findFirst.mockResolvedValue(null)
    prismaMock.familyRelation.create.mockResolvedValue({ id: "rel-new" })

    const res = await addRelation(ROOT, { fromId: MEMBER, toId: STRANGER1, type: "SIBLING" })

    expect(res).toEqual({ ok: true, message: undefined })
    expect(prismaMock.familyRelation.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "PENDING" }) }),
    )
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ userId: STRANGER1 }))
  })

  it("does not auto-create a SPOUSE link to an out-of-tree new parent (no unconsented marriage)", async () => {
    mockUsers({
      [STRANGER1]: { id: STRANGER1, role: "APP_USER" }, // new parent, out of tree
      [MEMBER]: { id: MEMBER, role: "APP_GHOST" },       // child, in tree
    })
    vi.mocked(getTreeMemberIds).mockResolvedValue(new Set([ROOT, MEMBER])) // linkSpouse ROOT in tree
    prismaMock.familyRelation.findFirst.mockResolvedValue(null)
    prismaMock.familyRelation.create.mockResolvedValue({ id: "rel-new" })

    const res = await addRelation(ROOT, {
      fromId: STRANGER1, toId: MEMBER, type: "PARENT_OF", linkSpouseId: ROOT,
    })

    expect(res).toEqual({ ok: true, message: undefined })
    // only the main (PENDING) PARENT_OF relation — the spouse auto-link is skipped
    expect(prismaMock.familyRelation.create).toHaveBeenCalledTimes(1)
  })
})

describe("addGhostRelative — IDOR guard", () => {
  it("rejects anchoring a ghost to a profile outside root's tree and never opens the transaction", async () => {
    vi.mocked(getTreeMemberIds).mockResolvedValue(new Set([ROOT])) // anchor not reachable from root

    const res = await addGhostRelative(ROOT, {
      firstName: "Jane", lastName: "Doe", anchorId: FOREIGN_MEMO, kind: "parent",
    })

    expect(res).toEqual({ ok: false, message: "familyTree.notAuthorized" })
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it("allows anchoring a ghost to a member of root's tree", async () => {
    vi.mocked(getTreeMemberIds).mockResolvedValue(new Set([ROOT])) // anchor = ROOT, in tree
    const tx = {
      appUser: { create: vi.fn().mockResolvedValue({ id: "ghost-new" }) },
      appUserGuardian: { create: vi.fn() },
      familyRelation: { create: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    }
    prismaMock.$transaction.mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx))

    const res = await addGhostRelative(ROOT, {
      firstName: "Jane", lastName: "Doe", anchorId: ROOT, kind: "parent",
    })

    expect(res).toEqual({ ok: true, message: undefined })
    expect(tx.appUser.create).toHaveBeenCalled()
    expect(tx.familyRelation.create).toHaveBeenCalled()
  })
})

describe("removeRelation — pending-invite management (ACCEPTED-only membership)", () => {
  it("lets the sender withdraw their own PENDING invite though the invitee isn't an accepted member", async () => {
    prismaMock.familyRelation.findUnique.mockResolvedValue({
      fromId: "A", toId: STRANGER1, status: "PENDING", requestedById: "mgr",
    })
    vi.mocked(getTreeMemberIds).mockResolvedValue(new Set(["A"])) // STRANGER1 not an accepted member
    prismaMock.familyRelation.delete.mockResolvedValue({})

    const res = await removeRelation("A", "rel-1")

    expect(res).toEqual({ ok: true, message: undefined })
    expect(prismaMock.familyRelation.delete).toHaveBeenCalledWith({ where: { id: "rel-1" } })
  })

  it("rejects deleting a PENDING invite the caller did not send", async () => {
    prismaMock.familyRelation.findUnique.mockResolvedValue({
      fromId: "A", toId: STRANGER1, status: "PENDING", requestedById: "someone-else",
    })
    vi.mocked(getTreeMemberIds).mockResolvedValue(new Set(["A"]))

    const res = await removeRelation("A", "rel-1")

    expect(res).toEqual({ ok: false, message: "familyTree.notAuthorized" })
    expect(prismaMock.familyRelation.delete).not.toHaveBeenCalled()
  })
})
