import type { Translator } from "@genealogiq/core"
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
 * `t` must be scoped to the "FamilyTree" namespace (keys live under
 * "relation.*") — accepting a Translator (rather than hardcoding English)
 * lets this run from a server context too (e.g. GEDCOM export, a printable
 * chart), not just the client component that calls it today.
 *
 * Returns null for the root itself; falls back to relation.relative for
 * paths we don't have specific copy for.
 */
export function relationFromRoot(
  persons: Record<string, TreePerson>,
  relations: TreeRelation[],
  rootId: string,
  targetId: string,
  t: Translator,
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

  if (!found) return t("relation.relative")

  return labelForPath(found.via, found.flags, persons[targetId]!.gender, t)
}

function labelForPath(
  via: Direction[],
  flags: { isStep: boolean }[],
  gender: string | null,
  t: Translator,
): string {
  const isFem = gender === "FEMALE"
  const path = via.join(">")
  const anyStep = (...indices: number[]) => indices.some((i) => flags[i]?.isStep)

  // 1 hop
  if (path === "parent")  return anyStep(0) ? (isFem ? t("relation.stepMother") : t("relation.stepFather")) : (isFem ? t("relation.mother") : t("relation.father"))
  if (path === "child")   return anyStep(0) ? (isFem ? t("relation.stepDaughter") : t("relation.stepSon")) : (isFem ? t("relation.daughter") : t("relation.son"))
  if (path === "spouse")  return isFem ? t("relation.wife") : t("relation.husband")
  if (path === "sibling") return flags[0]?.isStep ? (isFem ? t("relation.halfSister") : t("relation.halfBrother")) : (isFem ? t("relation.sister") : t("relation.brother"))

  // 2 hops
  if (path === "parent>parent")   return isFem ? t("relation.grandmother") : t("relation.grandfather")
  if (path === "child>child")     return isFem ? t("relation.granddaughter") : t("relation.grandson")
  if (path === "parent>sibling")  return isFem ? t("relation.aunt") : t("relation.uncle")
  if (path === "sibling>child")   return isFem ? t("relation.niece") : t("relation.nephew")
  if (path === "parent>spouse")   return isFem ? t("relation.stepMother") : t("relation.stepFather")
  if (path === "spouse>parent")   return isFem ? t("relation.motherInLaw") : t("relation.fatherInLaw")
  if (path === "spouse>child")    return isFem ? t("relation.stepDaughter") : t("relation.stepSon")
  if (path === "sibling>spouse")  return isFem ? t("relation.sisterInLaw") : t("relation.brotherInLaw")
  if (path === "spouse>sibling")  return isFem ? t("relation.sisterInLaw") : t("relation.brotherInLaw")

  // 3 hops
  if (path === "parent>parent>parent") return isFem ? t("relation.greatGrandmother") : t("relation.greatGrandfather")
  if (path === "child>child>child")    return isFem ? t("relation.greatGranddaughter") : t("relation.greatGrandson")
  // English "cousin" has no gender distinction, and the original algorithm
  // never branched on it — kept as a single key here too. Gendered cousin
  // terms (primo/prima, etc.) are backlog (relationship-calculator coverage).
  if (path === "parent>sibling>child") return t("relation.cousin")
  if (path === "parent>parent>sibling") return isFem ? t("relation.greatAunt") : t("relation.greatUncle")
  if (path === "sibling>child>child")   return isFem ? t("relation.grandNiece") : t("relation.grandNephew")

  return t("relation.relative")
}
