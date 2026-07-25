import type { Translator } from "@genealogiq/core"
import type { TreePerson, TreeRelation } from "@/queries/family-tree"

type Direction = "parent" | "child" | "spouse" | "sibling"

export interface RelationPathStep {
  via:        Direction
  toId:       string
  /** The TreeRelation.id this step traversed — lets a caller (e.g. the
   *  canvas's relationship-path highlight) map the path back onto edges. */
  relationId: string
  isStep:     boolean   // step / adopted PARENT_OF
}

export interface RelationPath {
  targetId: string
  /** In order from rootId to targetId; empty only if rootId === targetId
   *  (which this function refuses — see below). */
  steps:    RelationPathStep[]
}

/**
 * Shortest path from `rootId` to `targetId` through the relations graph
 * (unweighted BFS — first path found is shortest by hop count). Each step
 * carries the relation id it traversed, so a caller can highlight the exact
 * edges. Returns null when unreachable within `maxHops`, or when
 * rootId === targetId (a path to yourself is meaningless here).
 */
export function findRelationPath(
  relations: TreeRelation[],
  rootId: string,
  targetId: string,
  maxHops = 12,
): RelationPath | null {
  if (rootId === targetId) return null

  // Build directed adjacency from relations.
  const adj = new Map<string, RelationPathStep[]>()
  const push = (from: string, step: RelationPathStep) => {
    const arr = adj.get(from) ?? []
    arr.push(step)
    adj.set(from, arr)
  }
  for (const r of relations) {
    const isStep = r.subtype === "step" || r.subtype === "adopted"
    if (r.type === "PARENT_OF") {
      push(r.toId,   { via: "parent", toId: r.fromId, relationId: r.id, isStep })
      push(r.fromId, { via: "child",  toId: r.toId,   relationId: r.id, isStep })
    } else if (r.type === "SPOUSE") {
      push(r.fromId, { via: "spouse", toId: r.toId,   relationId: r.id, isStep: false })
      push(r.toId,   { via: "spouse", toId: r.fromId, relationId: r.id, isStep: false })
    } else if (r.type === "SIBLING") {
      const sibStep = r.subtype === "half" || r.subtype === "step"
      push(r.fromId, { via: "sibling", toId: r.toId,   relationId: r.id, isStep: sibStep })
      push(r.toId,   { via: "sibling", toId: r.fromId, relationId: r.id, isStep: sibStep })
    }
  }

  type QueueItem = { id: string; steps: RelationPathStep[] }
  const queue: QueueItem[] = [{ id: rootId, steps: [] }]
  const visited = new Set<string>([rootId])

  while (queue.length > 0) {
    const cur = queue.shift()!
    if (cur.steps.length >= maxHops) continue
    for (const s of adj.get(cur.id) ?? []) {
      if (visited.has(s.toId)) continue
      visited.add(s.toId)
      const nextSteps = [...cur.steps, s]
      if (s.toId === targetId) return { targetId, steps: nextSteps }
      queue.push({ id: s.toId, steps: nextSteps })
    }
  }
  return null
}

/**
 * Computes a human label for `targetId` from the perspective of `rootId`,
 * walking up to 4 hops through the relations graph (see findRelationPath).
 * Picks the shortest path by hop count; returns the most-specific gendered
 * label we can.
 *
 * `t` must be scoped to the "FamilyTree" namespace (keys live under
 * "relation.*") — accepting a Translator (rather than hardcoding English)
 * lets this run from a server context too (e.g. GEDCOM export, a printable
 * chart), not just the client component that calls it today.
 *
 * `possessive` (default true) picks which key set to read: "relation.*"
 * ("Your cousin" / "Seu primo" — for labeling relative to the LOGGED-IN
 * VIEWER, e.g. person-info-sheet.tsx) or "relation.bare.*" ("cousin" /
 * "primo", no possessive — for a sentence that already names both people,
 * e.g. the canvas compare tool's "X is Y's {label}"). Using the possessive
 * form there would wrongly claim the relationship is to the reader.
 *
 * Returns null for the root itself; falls back to relation(.bare).relative
 * for paths we don't have specific copy for (including "unreachable within
 * 4 hops" — a real but distant relative, not a stranger).
 */
export function relationFromRoot(
  persons: Record<string, TreePerson>,
  relations: TreeRelation[],
  rootId: string,
  targetId: string,
  t: Translator,
  possessive = true,
): string | null {
  if (rootId === targetId) return null
  if (!persons[targetId]) return null

  const path = findRelationPath(relations, rootId, targetId, 4)
  const rel = (key: string) => t(possessive ? `relation.${key}` : `relation.bare.${key}`)
  if (!path) return rel("relative")

  const via   = path.steps.map((s) => s.via)
  const flags = path.steps.map((s) => ({ isStep: s.isStep }))
  return labelForPath(via, flags, persons[targetId]!.gender, rel)
}

function labelForPath(
  via: Direction[],
  flags: { isStep: boolean }[],
  gender: string | null,
  rel: (key: string) => string,
): string {
  const isFem = gender === "FEMALE"
  const path = via.join(">")
  const anyStep = (...indices: number[]) => indices.some((i) => flags[i]?.isStep)

  // 1 hop
  if (path === "parent")  return anyStep(0) ? (isFem ? rel("stepMother") : rel("stepFather")) : (isFem ? rel("mother") : rel("father"))
  if (path === "child")   return anyStep(0) ? (isFem ? rel("stepDaughter") : rel("stepSon")) : (isFem ? rel("daughter") : rel("son"))
  if (path === "spouse")  return isFem ? rel("wife") : rel("husband")
  if (path === "sibling") return flags[0]?.isStep ? (isFem ? rel("halfSister") : rel("halfBrother")) : (isFem ? rel("sister") : rel("brother"))

  // 2 hops
  if (path === "parent>parent")   return isFem ? rel("grandmother") : rel("grandfather")
  if (path === "child>child")     return isFem ? rel("granddaughter") : rel("grandson")
  if (path === "parent>sibling")  return isFem ? rel("aunt") : rel("uncle")
  if (path === "sibling>child")   return isFem ? rel("niece") : rel("nephew")
  if (path === "parent>spouse")   return isFem ? rel("stepMother") : rel("stepFather")
  if (path === "spouse>parent")   return isFem ? rel("motherInLaw") : rel("fatherInLaw")
  if (path === "spouse>child")    return isFem ? rel("stepDaughter") : rel("stepSon")
  if (path === "sibling>spouse")  return isFem ? rel("sisterInLaw") : rel("brotherInLaw")
  if (path === "spouse>sibling")  return isFem ? rel("sisterInLaw") : rel("brotherInLaw")

  // 3 hops
  if (path === "parent>parent>parent") return isFem ? rel("greatGrandmother") : rel("greatGrandfather")
  if (path === "child>child>child")    return isFem ? rel("greatGranddaughter") : rel("greatGrandson")
  // English "cousin" has no gender distinction, and the original algorithm
  // never branched on it — kept as a single key here too. Gendered cousin
  // terms (primo/prima, etc.) are backlog (relationship-calculator coverage).
  if (path === "parent>sibling>child") return rel("cousin")
  if (path === "parent>parent>sibling") return isFem ? rel("greatAunt") : rel("greatUncle")
  if (path === "sibling>child>child")   return isFem ? rel("grandNiece") : rel("grandNephew")

  return rel("relative")
}
