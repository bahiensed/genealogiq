import "server-only"
import { prisma } from "@/lib/prisma"

export interface TreePerson {
  id:           string
  firstName:    string
  lastName:     string
  maidenName:   string | null
  nickname:     string | null
  gender:       string | null
  avatarUrl:    string | null
  birthDate:    Date | null
  birthPlace:   string | null
  birthCountry: string | null
  deathDate:    Date | null
  deathPlace:   string | null
  deathCountry: string | null
  role:         string
  /** True when at least one relation touching this person is still PENDING and this person isn't the root. */
  pending:      boolean
}

export interface TreeRelation {
  id:        string
  type:      string
  subtype:   string | null
  fromId:    string
  toId:      string
  startDate: Date | null
  endDate:   Date | null
  status:    string
  requestedById: string | null
}

export interface FamilyTreeData {
  persons:   Record<string, TreePerson>
  relations: TreeRelation[]
}

export async function getFamilyTree(rootId: string): Promise<FamilyTreeData> {
  // BFS reachable set from root via FamilyRelation
  const discovered = new Set<string>([rootId])
  let frontier = [rootId]
  while (frontier.length > 0) {
    const rels = await prisma.familyRelation.findMany({
      where:  { OR: [{ fromId: { in: frontier } }, { toId: { in: frontier } }] },
      select: { fromId: true, toId: true },
    })
    const next: string[] = []
    for (const r of rels) {
      if (!discovered.has(r.fromId)) { discovered.add(r.fromId); next.push(r.fromId) }
      if (!discovered.has(r.toId))   { discovered.add(r.toId);   next.push(r.toId) }
    }
    frontier = next
  }

  const ids = Array.from(discovered)

  const [users, relations] = await Promise.all([
    prisma.appUser.findMany({
      where: { id: { in: ids } },
      select: {
        id: true, firstName: true, lastName: true,
        maidenName: true, nickname: true,
        gender: true, avatarUrl: true,
        birthDate: true, birthPlace: true, birthCountry: true,
        deathDate: true, deathPlace: true, deathCountry: true,
        role: true,
      },
    }),
    prisma.familyRelation.findMany({
      where:  { OR: [{ fromId: { in: ids } }, { toId: { in: ids } }] },
      select: {
        id: true, type: true, subtype: true,
        fromId: true, toId: true,
        startDate: true, endDate: true,
        status: true, requestedById: true,
      },
    }),
  ])

  // Mark people as pending when at least one relation touching them is PENDING
  // and they are not the root themselves.
  const pendingIds = new Set<string>()
  for (const r of relations) {
    if (r.status === "PENDING") {
      if (r.fromId !== rootId) pendingIds.add(r.fromId)
      if (r.toId !== rootId)   pendingIds.add(r.toId)
    }
  }

  const persons: Record<string, TreePerson> = {}
  for (const u of users) {
    persons[u.id] = { ...u, pending: pendingIds.has(u.id) }
  }

  return { persons, relations }
}

export async function getTreeMemberIds(rootId: string): Promise<Set<string>> {
  const discovered = new Set<string>([rootId])
  let frontier = [rootId]
  while (frontier.length > 0) {
    const rels = await prisma.familyRelation.findMany({
      where:  { OR: [{ fromId: { in: frontier } }, { toId: { in: frontier } }] },
      select: { fromId: true, toId: true },
    })
    const next: string[] = []
    for (const r of rels) {
      if (!discovered.has(r.fromId)) { discovered.add(r.fromId); next.push(r.fromId) }
      if (!discovered.has(r.toId))   { discovered.add(r.toId);   next.push(r.toId) }
    }
    frontier = next
  }
  return discovered
}

export async function countTreeMembers(rootId: string): Promise<number> {
  return (await getTreeMemberIds(rootId)).size
}
