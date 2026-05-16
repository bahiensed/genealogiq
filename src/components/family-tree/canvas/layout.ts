import type { TreePerson, TreeRelation } from "@/queries/family-tree"

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Comparator that puts the older person first (leftmost). Unknown birth dates
 *  sort to the end. */
function byBirthAsc(persons: Record<string, TreePerson>) {
  return (a: string, b: string) => {
    const ba = persons[a]?.birthDate?.getTime() ?? Number.POSITIVE_INFINITY
    const bb = persons[b]?.birthDate?.getTime() ?? Number.POSITIVE_INFINITY
    return ba - bb
  }
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const NODE_W    = 168
export const NODE_H    = 72
export const Y_GEN     = 140   // vertical distance between generations
export const X_TIGHT   = 24    // spacing between spouses inside the same cluster
export const X_SIBLING = 40    // spacing between sibling clusters (children of same parents)
export const X_FAMILY  = 64    // gap between unrelated family groups at the same generation

// ─── Output types ────────────────────────────────────────────────────────────

export interface LaidNode {
  id: string
  x:  number
  y:  number
}

export interface ParentLineGeom {
  parentId:  string
  childId:   string
  subtype:   string
  // Geometry computed by the canvas, not here — but we pass enough hints.
}

export interface CoupleLineGeom {
  aId:     string
  bId:     string
  subtype: string
  endDate: Date | null
}

export interface SiblingLineGeom {
  aId:     string
  bId:     string
  subtype: string
}

export interface LayoutResult {
  nodes:        LaidNode[]
  parentLines:  ParentLineGeom[]
  coupleLines:  CoupleLineGeom[]
  siblingLines: SiblingLineGeom[]
  bounds:       { minX: number; maxX: number; minY: number; maxY: number }
  generation:   Map<string, number>
}

// ─── Layout ──────────────────────────────────────────────────────────────────

export function computeLayout(
  persons:   Record<string, TreePerson>,
  relations: TreeRelation[],
  rootId:    string,
): LayoutResult {
  // Adjacency maps
  const parents  = new Map<string, Set<string>>()
  const children = new Map<string, Set<string>>()
  const spouses  = new Map<string, Set<string>>()
  const siblings = new Map<string, Set<string>>()

  const ensure = (m: Map<string, Set<string>>, k: string) => {
    if (!m.has(k)) m.set(k, new Set())
    return m.get(k)!
  }

  for (const r of relations) {
    if (r.type === "PARENT_OF") {
      ensure(parents, r.toId).add(r.fromId)
      ensure(children, r.fromId).add(r.toId)
    } else if (r.type === "SPOUSE") {
      ensure(spouses, r.fromId).add(r.toId)
      ensure(spouses, r.toId).add(r.fromId)
    } else if (r.type === "SIBLING") {
      ensure(siblings, r.fromId).add(r.toId)
      ensure(siblings, r.toId).add(r.fromId)
    }
  }

  // Assign generation via BFS from root.
  const generation = new Map<string, number>()
  generation.set(rootId, 0)
  const queue: string[] = [rootId]
  while (queue.length > 0) {
    const id = queue.shift()!
    const gen = generation.get(id)!
    for (const p of parents.get(id)  ?? []) if (!generation.has(p)) { generation.set(p, gen - 1); queue.push(p) }
    for (const c of children.get(id) ?? []) if (!generation.has(c)) { generation.set(c, gen + 1); queue.push(c) }
    for (const s of spouses.get(id)  ?? []) if (!generation.has(s)) { generation.set(s, gen);     queue.push(s) }
    for (const s of siblings.get(id) ?? []) if (!generation.has(s)) { generation.set(s, gen);     queue.push(s) }
  }

  // Group by gen.
  const byGen = new Map<number, string[]>()
  for (const [id, gen] of generation.entries()) {
    if (!byGen.has(gen)) byGen.set(gen, [])
    byGen.get(gen)!.push(id)
  }

  // Position map.
  const position = new Map<string, { x: number; y: number }>()

  // Oldest first → leftmost.
  const byAge = byBirthAsc(persons)

  // Place root + its same-gen spouse(s) at x = 0, ordered by age (oldest leftmost).
  const rootCluster = [
    rootId,
    ...Array.from(spouses.get(rootId) ?? []).filter((s) => generation.get(s) === 0),
  ].sort(byAge)
  let cx = 0
  for (const id of rootCluster) {
    position.set(id, { x: cx, y: 0 })
    cx += NODE_W + X_TIGHT
  }

  // Same-gen siblings of root (oldest first), each followed by their own spouses,
  // so siblings' spouses don't fall through to the (0, 0) fallback and stack on
  // top of the root.
  const sib0 = Array.from(siblings.get(rootId) ?? [])
    .filter((s) => generation.get(s) === 0 && !position.has(s))
    .sort(byAge)
  for (const id of sib0) {
    // Sibling on the left of its couple if older than the spouse, else its
    // spouse goes left.
    const spouseList = Array.from(spouses.get(id) ?? [])
      .filter((sp) => !position.has(sp) && generation.get(sp) === 0)
    const couple = [id, ...spouseList].sort(byAge)
    for (const memberId of couple) {
      position.set(memberId, { x: cx, y: 0 })
      cx += NODE_W + X_TIGHT
    }
  }

  // Defensive: anyone else the BFS reached at gen 0 — place them adjacent so the
  // (0, 0) fallback can never bury the root.
  const stragglers0 = (byGen.get(0) ?? []).filter((id) => !position.has(id)).sort(byAge)
  for (const id of stragglers0) {
    const spouseList = Array.from(spouses.get(id) ?? [])
      .filter((sp) => !position.has(sp) && generation.get(sp) === 0)
    const couple = [id, ...spouseList].sort(byAge)
    for (const memberId of couple) {
      position.set(memberId, { x: cx, y: 0 })
      cx += NODE_W + X_TIGHT
    }
  }

  // Walk other generations outward, closest to root first.
  const sortedGens = Array.from(byGen.keys()).sort((a, b) => Math.abs(a) - Math.abs(b))

  // Compute couple groups for a generation: greedy pair-up of spouses at same gen.
  // Iteration order and intra-cluster order are both age-ascending (oldest leftmost).
  const buildClusters = (gen: number): string[][] => {
    const ids = (byGen.get(gen) ?? []).filter((id) => !position.has(id)).sort(byAge)
    const seen = new Set<string>()
    const clusters: string[][] = []
    for (const id of ids) {
      if (seen.has(id)) continue
      const cluster = [id]
      seen.add(id)
      for (const sp of spouses.get(id) ?? []) {
        if (!seen.has(sp) && generation.get(sp) === gen && (byGen.get(gen) ?? []).includes(sp) && !position.has(sp)) {
          cluster.push(sp)
          seen.add(sp)
        }
      }
      // Reorder the couple so the older spouse is on the left.
      cluster.sort(byAge)
      clusters.push(cluster)
    }
    return clusters
  }

  // For each cluster, compute the placed-neighbor anchor (top-left x) and a grouping key.
  // Clusters sharing the same key form a sibling group and will be centered together on the anchor.
  const computeAnchorAndKey = (cluster: string[]): { anchor: number; key: string } => {
    const placedParents:  string[] = []
    const placedChildren: string[] = []
    const placedSiblings: string[] = []
    const gen = generation.get(cluster[0]) ?? 0

    for (const id of cluster) {
      for (const p of parents.get(id) ?? [])   if (position.has(p) && !placedParents.includes(p))   placedParents.push(p)
      for (const c of children.get(id) ?? [])  if (position.has(c) && !placedChildren.includes(c))  placedChildren.push(c)
      for (const s of siblings.get(id) ?? [])  {
        if (position.has(s) && generation.get(s) === gen && !placedSiblings.includes(s)) placedSiblings.push(s)
      }
    }

    if (placedParents.length > 0) {
      // Special case: exactly one placed parent AND that parent has a placed
      // spouse at the same generation. Anchor on the couple's midpoint with a
      // L/R side marker so the placement loop can flank both ancestor branches
      // symmetrically around the couple.
      if (placedParents.length === 1) {
        const linkedParent = placedParents[0]
        const linkedParentGen = generation.get(linkedParent)!
        const couplePartner = Array.from(spouses.get(linkedParent) ?? [])
          .find((s) => position.has(s) && generation.get(s) === linkedParentGen)
        if (couplePartner) {
          const lpX = position.get(linkedParent)!.x
          const lsX = position.get(couplePartner)!.x
          const coupleMidX = (lpX + lsX + NODE_W) / 2  // center of the couple
          const side: "L" | "R" = lpX < lsX ? "L" : "R"
          const coupleKey = [linkedParent, couplePartner].sort().join("|")
          return {
            anchor: coupleMidX - NODE_W / 2,
            key:    `__couple_${coupleKey}_${side}`,
          }
        }
      }
      const key = [...placedParents].sort().join("|")
      const anchor = placedParents.reduce((s, p) => s + position.get(p)!.x, 0) / placedParents.length
      return { anchor, key }
    }
    if (placedChildren.length > 0) {
      const anchor = placedChildren.reduce((s, c) => s + position.get(c)!.x, 0) / placedChildren.length
      return { anchor, key: `__anc_${cluster[0]}` }
    }
    if (placedSiblings.length > 0) {
      const anchor = placedSiblings.reduce((s, x) => s + position.get(x)!.x, 0) / placedSiblings.length + NODE_W + X_TIGHT
      return { anchor, key: `__sib_${cluster[0]}` }
    }
    return { anchor: 0, key: `__iso_${cluster[0]}` }
  }

  const clusterWidth = (c: string[]) => c.length * NODE_W + (c.length - 1) * X_TIGHT

  // Helper: place a sibling-group (list of clusters that share an anchor) at a
  // given leftX. Returns the rightX after placement.
  const placeGroup = (group: { c: string[]; anchor: number }[], leftX: number, y: number): number => {
    // Within a sibling-group, place oldest-sibling-cluster leftmost.
    group.sort((g1, g2) => byAge(g1.c[0], g2.c[0]))
    const totalWidth =
      group.reduce((sum, g) => sum + clusterWidth(g.c), 0) +
      (group.length - 1) * X_SIBLING
    let px = leftX
    for (let i = 0; i < group.length; i++) {
      const { c } = group[i]
      for (const id of c) {
        position.set(id, { x: px, y })
        px += NODE_W + X_TIGHT
      }
      px -= X_TIGHT
      if (i < group.length - 1) px += X_SIBLING
    }
    return leftX + totalWidth
  }

  const groupWidth = (group: { c: string[]; anchor: number }[]) =>
    group.reduce((sum, g) => sum + clusterWidth(g.c), 0) + (group.length - 1) * X_SIBLING

  for (const gen of sortedGens) {
    if (gen === 0) continue
    const y = gen * Y_GEN
    const clusters = buildClusters(gen)

    // Group clusters by their anchor key (siblings sharing the same parents).
    const grouped = new Map<string, { c: string[]; anchor: number }[]>()
    for (const c of clusters) {
      const { anchor, key } = computeAnchorAndKey(c)
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push({ c, anchor })
    }

    // Identify couple-flank pairs (ancestors of one half vs the other half of
    // a placed couple). Pair them up so the two branches flank the couple's
    // midpoint symmetrically. Everything else is a "solo" sibling-group.
    type Unit =
      | { kind: "pair"; midX: number; leftEntries: typeof clusters extends never ? never : { c: string[]; anchor: number }[]; rightEntries: { c: string[]; anchor: number }[]; preferredLeftX: number; preferredRightEnd: number }
      | { kind: "solo"; entries: { c: string[]; anchor: number }[]; preferredLeftX: number; preferredRightEnd: number }

    const units: Unit[] = []
    const flankL = new Map<string, { entries: { c: string[]; anchor: number }[]; midX: number }>()
    const flankR = new Map<string, { entries: { c: string[]; anchor: number }[]; midX: number }>()

    for (const [key, entries] of grouped.entries()) {
      const m = key.match(/^__couple_(.+)_([LR])$/)
      if (m) {
        const coupleKey = m[1]
        const side = m[2] as "L" | "R"
        // Stored anchor was midX - NODE_W/2.
        const midX = entries[0].anchor + NODE_W / 2
        if (side === "L") flankL.set(coupleKey, { entries, midX })
        else flankR.set(coupleKey, { entries, midX })
      } else {
        const totalW = groupWidth(entries)
        const leftX = entries[0].anchor + NODE_W / 2 - totalW / 2
        units.push({ kind: "solo", entries, preferredLeftX: leftX, preferredRightEnd: leftX + totalW })
      }
    }

    for (const [coupleKey, lFlank] of flankL.entries()) {
      const rFlank = flankR.get(coupleKey)
      if (rFlank) {
        flankR.delete(coupleKey)
        const totalWL = groupWidth(lFlank.entries)
        const totalWR = groupWidth(rFlank.entries)
        const leftXL = lFlank.midX - X_FAMILY / 2 - totalWL
        const rightEnd = lFlank.midX + X_FAMILY / 2 + totalWR
        units.push({
          kind:              "pair",
          midX:              lFlank.midX,
          leftEntries:       lFlank.entries,
          rightEntries:      rFlank.entries,
          preferredLeftX:    leftXL,
          preferredRightEnd: rightEnd,
        })
      } else {
        // Lone left flank — treat as solo, anchor on midX.
        const totalW = groupWidth(lFlank.entries)
        const leftX = lFlank.midX - totalW / 2
        units.push({ kind: "solo", entries: lFlank.entries, preferredLeftX: leftX, preferredRightEnd: leftX + totalW })
      }
    }
    for (const [, rFlank] of flankR.entries()) {
      const totalW = groupWidth(rFlank.entries)
      const leftX = rFlank.midX - totalW / 2
      units.push({ kind: "solo", entries: rFlank.entries, preferredLeftX: leftX, preferredRightEnd: leftX + totalW })
    }

    // Sort all units by their preferred leftmost X and place left-to-right,
    // shifting right when needed to avoid collisions. Flank pairs shift as a
    // single block, preserving their internal symmetry.
    units.sort((a, b) => a.preferredLeftX - b.preferredLeftX)

    let lastRight = -Infinity
    for (const u of units) {
      const shift = Math.max(0, (lastRight + X_FAMILY) - u.preferredLeftX)
      if (u.kind === "solo") {
        const leftX = u.preferredLeftX + shift
        lastRight = placeGroup(u.entries, leftX, y)
      } else {
        const leftXL = u.preferredLeftX + shift
        const leftXR = u.midX + X_FAMILY / 2 + shift
        placeGroup(u.leftEntries, leftXL, y)
        lastRight = placeGroup(u.rightEntries, leftXR, y)
      }
    }
  }

  // Anyone still un-positioned (very disconnected) goes to (0, 0) — query already filtered so this shouldn't fire.
  for (const id of generation.keys()) {
    if (!position.has(id)) position.set(id, { x: 0, y: (generation.get(id) ?? 0) * Y_GEN })
  }

  // Build edge geometry inputs (visual paths computed by edge components).
  const parentLines:  ParentLineGeom[]  = []
  const coupleLines:  CoupleLineGeom[]  = []
  const siblingLines: SiblingLineGeom[] = []

  for (const r of relations) {
    if (r.type === "PARENT_OF") {
      parentLines.push({ parentId: r.fromId, childId: r.toId, subtype: r.subtype ?? "blood" })
    } else if (r.type === "SPOUSE") {
      coupleLines.push({ aId: r.fromId, bId: r.toId, subtype: r.subtype ?? "married", endDate: r.endDate })
    } else if (r.type === "SIBLING") {
      const pa = parents.get(r.fromId) ?? new Set()
      const pb = parents.get(r.toId)   ?? new Set()
      let shared = false
      for (const p of pa) if (pb.has(p)) { shared = true; break }
      if (!shared) siblingLines.push({ aId: r.fromId, bId: r.toId, subtype: r.subtype ?? "blood" })
    }
  }

  // Persons referenced ensure no orphans slip in.
  void persons

  // Bounds
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  const nodes: LaidNode[] = []
  for (const [id, p] of position.entries()) {
    nodes.push({ id, x: p.x, y: p.y })
    if (p.x < minX) minX = p.x
    if (p.x + NODE_W > maxX) maxX = p.x + NODE_W
    if (p.y < minY) minY = p.y
    if (p.y + NODE_H > maxY) maxY = p.y + NODE_H
  }
  if (!Number.isFinite(minX)) { minX = 0; maxX = NODE_W; minY = 0; maxY = NODE_H }

  return {
    nodes,
    parentLines,
    coupleLines,
    siblingLines,
    bounds: { minX, maxX, minY, maxY },
    generation,
  }
}
