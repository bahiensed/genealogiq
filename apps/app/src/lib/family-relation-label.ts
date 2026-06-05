import type { TreePerson, TreeRelation } from "@/queries/family-tree"

type Direction = "parent" | "child" | "spouse" | "sibling"

interface Step {
  via:    Direction
  toId:   string
  isStep: boolean   // step / adopted PARENT_OF
}

/**
 * Computes a human label for `targetId` from the perspective of `rootId`,
 * walking up to 4 hops through the relations graph. Picks the shortest path
 * by total step weight; returns the most-specific gendered label we can.
 *
 * Returns null for the root itself; falls back to "Your relative" for paths
 * we don't have specific copy for.
 */
export function relationFromRoot(
  persons: Record<string, TreePerson>,
  relations: TreeRelation[],
  rootId: string,
  targetId: string,
): string | null {
  if (rootId === targetId) return null
  if (!persons[targetId]) return null

  // Build directed adjacency from relations.
  const adj = new Map<string, Step[]>()
  const push = (from: string, step: Step) => {
    const arr = adj.get(from) ?? []
    arr.push(step)
    adj.set(from, arr)
  }
  for (const r of relations) {
    const isStep = r.subtype === "step" || r.subtype === "adopted"
    if (r.type === "PARENT_OF") {
      push(r.toId,   { via: "parent", toId: r.fromId, isStep })
      push(r.fromId, { via: "child",  toId: r.toId,   isStep })
    } else if (r.type === "SPOUSE") {
      push(r.fromId, { via: "spouse", toId: r.toId,   isStep: false })
      push(r.toId,   { via: "spouse", toId: r.fromId, isStep: false })
    } else if (r.type === "SIBLING") {
      push(r.fromId, { via: "sibling", toId: r.toId,  isStep: r.subtype === "half" || r.subtype === "step" })
      push(r.toId,   { via: "sibling", toId: r.fromId, isStep: r.subtype === "half" || r.subtype === "step" })
    }
  }

  // BFS, track path as a sequence of Directions + flags.
  type PathItem = { id: string; via: Direction[]; flags: { isStep: boolean }[] }
  const queue: PathItem[] = [{ id: rootId, via: [], flags: [] }]
  const visited = new Set<string>([rootId])
  const maxHops = 4

  let found: PathItem | null = null
  while (queue.length > 0) {
    const cur = queue.shift()!
    if (cur.via.length >= maxHops) continue
    const steps = adj.get(cur.id) ?? []
    for (const s of steps) {
      if (visited.has(s.toId)) continue
      visited.add(s.toId)
      const next: PathItem = {
        id:    s.toId,
        via:   [...cur.via, s.via],
        flags: [...cur.flags, { isStep: s.isStep }],
      }
      if (s.toId === targetId) { found = next; break }
      queue.push(next)
    }
    if (found) break
  }

  if (!found) return "Your relative"

  return labelForPath(found.via, found.flags, persons[targetId]!.gender)
}

function labelForPath(
  via: Direction[],
  flags: { isStep: boolean }[],
  gender: string | null,
): string {
  const isFem = gender === "FEMALE"
  const path = via.join(">")
  const anyStep = (...indices: number[]) => indices.some((i) => flags[i]?.isStep)

  // 1 hop
  if (path === "parent")  return anyStep(0) ? (isFem ? "Your step-mother" : "Your step-father") : (isFem ? "Your mother" : "Your father")
  if (path === "child")   return anyStep(0) ? (isFem ? "Your step-daughter" : "Your step-son") : (isFem ? "Your daughter" : "Your son")
  if (path === "spouse")  return isFem ? "Your wife" : "Your husband"
  if (path === "sibling") return flags[0]?.isStep ? (isFem ? "Your half-sister" : "Your half-brother") : (isFem ? "Your sister" : "Your brother")

  // 2 hops
  if (path === "parent>parent")   return isFem ? "Your grandmother" : "Your grandfather"
  if (path === "child>child")     return isFem ? "Your granddaughter" : "Your grandson"
  if (path === "parent>sibling")  return isFem ? "Your aunt" : "Your uncle"
  if (path === "sibling>child")   return isFem ? "Your niece" : "Your nephew"
  if (path === "parent>spouse")   return isFem ? "Your step-mother" : "Your step-father"
  if (path === "spouse>parent")   return isFem ? "Your mother-in-law" : "Your father-in-law"
  if (path === "spouse>child")    return isFem ? "Your step-daughter" : "Your step-son"
  if (path === "sibling>spouse")  return isFem ? "Your sister-in-law" : "Your brother-in-law"
  if (path === "spouse>sibling")  return isFem ? "Your sister-in-law" : "Your brother-in-law"

  // 3 hops
  if (path === "parent>parent>parent") return isFem ? "Your great-grandmother" : "Your great-grandfather"
  if (path === "child>child>child")    return isFem ? "Your great-granddaughter" : "Your great-grandson"
  if (path === "parent>sibling>child") return "Your cousin"
  if (path === "parent>parent>sibling") return isFem ? "Your great-aunt" : "Your great-uncle"
  if (path === "sibling>child>child")   return isFem ? "Your grand-niece" : "Your grand-nephew"

  return "Your relative"
}
