import { prisma } from "@/lib/prisma"
import type { Node as RTNode, RelType, Gender } from "relatives-tree/lib/types"

export type TreePerson = {
  id: string
  firstName: string
  lastName: string
  gender: string | null
  avatarUrl: string | null
  birthDate: Date | null
  deathDate: Date | null
  marriages: Record<string, { status: string }>
}

export type FamilyTreeData = {
  rtNodes: RTNode[]
  persons: Record<string, TreePerson>
}

type MutableNode = {
  id: string
  gender: RTNode["gender"]
  parents:  { id: string; type: RelType }[]
  children: { id: string; type: RelType }[]
  siblings: { id: string; type: RelType }[]
  spouses:  { id: string; type: RelType }[]
}

export async function getFamilyTree(rootId: string): Promise<FamilyTreeData> {
  // BFS to collect all connected user IDs
  const discovered = new Set<string>([rootId])
  let frontier = [rootId]

  while (frontier.length > 0) {
    const relations = await prisma.familyRelation.findMany({
      where: { OR: [{ fromId: { in: frontier } }, { toId: { in: frontier } }] },
      select: { fromId: true, toId: true },
    })
    const next: string[] = []
    for (const r of relations) {
      if (!discovered.has(r.fromId)) { discovered.add(r.fromId); next.push(r.fromId) }
      if (!discovered.has(r.toId))   { discovered.add(r.toId);   next.push(r.toId) }
    }
    frontier = next
  }

  const ids = Array.from(discovered)

  // Fetch all users and all relations in two queries
  const [users, relations] = await Promise.all([
    prisma.appUser.findMany({
      where: { id: { in: ids } },
      select: {
        id: true, firstName: true, lastName: true,
        gender: true, avatarUrl: true, birthDate: true, deathDate: true,
      },
    }),
    prisma.familyRelation.findMany({
      where: { OR: [{ fromId: { in: ids } }, { toId: { in: ids } }] },
      select: { fromId: true, toId: true, type: true, subtype: true },
    }),
  ])

  // Build persons map
  const persons: Record<string, TreePerson> = {}
  for (const u of users) {
    persons[u.id] = {
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      gender: u.gender,
      avatarUrl: u.avatarUrl,
      birthDate: u.birthDate,
      deathDate: u.deathDate,
      marriages: {},
    }
  }

  // Build marriage metadata (subtype on SPOUSE relations)
  for (const r of relations) {
    if (r.type === "SPOUSE") {
      const status = r.subtype ?? "married"
      if (persons[r.fromId]) persons[r.fromId].marriages[r.toId] = { status }
      if (persons[r.toId])   persons[r.toId].marriages[r.fromId] = { status }
    }
  }

  // Build mutable node array
  const nodeById = new Map<string, MutableNode>()
  for (const id of ids) {
    nodeById.set(id, { id, gender: "male" as Gender, parents: [], children: [], siblings: [], spouses: [] })
  }

  for (const r of relations) {
    const subtype = (r.subtype ?? "blood") as RelType
    if (r.type === "PARENT_OF") {
      nodeById.get(r.fromId)?.children.push({ id: r.toId,   type: subtype })
      nodeById.get(r.toId)?.parents.push({   id: r.fromId, type: subtype })
    } else if (r.type === "SIBLING") {
      nodeById.get(r.fromId)?.siblings.push({ id: r.toId,   type: subtype })
      nodeById.get(r.toId)?.siblings.push({   id: r.fromId, type: subtype })
    } else if (r.type === "SPOUSE") {
      const spouseStatus = (r.subtype ?? "married") as RelType
      nodeById.get(r.fromId)?.spouses.push({ id: r.toId,   type: spouseStatus })
      nodeById.get(r.toId)?.spouses.push({   id: r.fromId, type: spouseStatus })
    }
  }

  // Set gender from persons map
  for (const node of nodeById.values()) {
    const user = persons[node.id]
    node.gender = (user?.gender === "FEMALE" ? "female" : "male") as RTNode["gender"]
  }

  const mutableNodes = Array.from(nodeById.values())
  const idSet = new Set(ids)

  // Passo 1 — filter dangling refs
  for (const node of mutableNodes) {
    node.parents  = node.parents.filter((e)  => idSet.has(e.id))
    node.children = node.children.filter((e) => idSet.has(e.id))
    node.siblings = node.siblings.filter((e) => idSet.has(e.id))
    node.spouses  = node.spouses.filter((e)  => idSet.has(e.id))
  }

  // Passo 2 — enforce symmetry
  for (const node of mutableNodes) {
    for (const c of node.children) {
      const child = nodeById.get(c.id)
      if (child && !child.parents.some((p) => p.id === node.id))
        child.parents.push({ id: node.id, type: c.type })
    }
    for (const p of node.parents) {
      const parent = nodeById.get(p.id)
      if (parent && !parent.children.some((c) => c.id === node.id))
        parent.children.push({ id: node.id, type: p.type })
    }
    for (const s of node.spouses) {
      const spouse = nodeById.get(s.id)
      if (spouse && !spouse.spouses.some((x) => x.id === node.id))
        spouse.spouses.push({ id: node.id, type: s.type })
    }
    for (const s of node.siblings) {
      const sibling = nodeById.get(s.id)
      if (sibling && !sibling.siblings.some((x) => x.id === node.id))
        sibling.siblings.push({ id: node.id, type: s.type })
    }
  }

  // Passo 2.5 — couple child merging
  // relatives-tree crashes when spouses have asymmetric children (X has child A, Z doesn't,
  // yet X+Z are spouses). For layout purposes both spouses must share all their children.
  // This does NOT write to the DB — it only affects the in-memory layout data.
  for (const node of mutableNodes) {
    for (const s of node.spouses) {
      const spouse = nodeById.get(s.id)
      if (!spouse) continue
      // Add node's children to spouse's children (and vice versa)
      for (const child of node.children) {
        if (!spouse.children.some((c) => c.id === child.id)) {
          spouse.children.push({ id: child.id, type: child.type })
          const childNode = nodeById.get(child.id)
          if (childNode && !childNode.parents.some((p) => p.id === spouse.id))
            childNode.parents.push({ id: spouse.id, type: child.type })
        }
      }
    }
  }

  // Passo 3 — co-parent spouse inference
  // relatives-tree requires co-parents to be spouses; without this the layout crashes.
  const childToParents = new Map<string, string[]>()
  for (const node of mutableNodes) {
    for (const child of node.children) {
      const list = childToParents.get(child.id) ?? []
      list.push(node.id)
      childToParents.set(child.id, list)
    }
  }
  for (const parentIds of childToParents.values()) {
    for (let i = 0; i < parentIds.length; i++) {
      for (let j = i + 1; j < parentIds.length; j++) {
        const a = nodeById.get(parentIds[i]!)!
        const b = nodeById.get(parentIds[j]!)!
        if (!a.spouses.some((s) => s.id === b.id)) {
          a.spouses.push({ id: b.id, type: "other" as RelType })
          b.spouses.push({ id: a.id, type: "other" as RelType })
        }
      }
    }
  }

  // Passo 4 — dedup each array
  for (const node of mutableNodes) {
    const uniq = <T extends { id: string }>(arr: T[]) => {
      const seen = new Set<string>()
      return arr.filter((e) => { if (seen.has(e.id)) return false; seen.add(e.id); return true })
    }
    node.parents  = uniq(node.parents)
    node.children = uniq(node.children)
    node.siblings = uniq(node.siblings)
    node.spouses  = uniq(node.spouses)
  }

  const rtNodes = mutableNodes as unknown as RTNode[]
  return { rtNodes, persons }
}

export async function getFamilyRelationCount(userId: string): Promise<number> {
  const [from, to] = await Promise.all([
    prisma.familyRelation.count({ where: { fromId: userId } }),
    prisma.familyRelation.count({ where: { toId: userId } }),
  ])
  return from + to
}
