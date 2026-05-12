import type { TreePerson, TreeRelation } from "@/queries/family-tree"

// ─── Constants ───────────────────────────────────────────────────────────────

export const NODE_W   = 168
export const NODE_H   = 72
export const Y_GEN    = 140    // vertical distance between generations
export const X_TIGHT  = 24     // sibling spacing inside a cluster
export const X_FAMILY = 64     // gap between distinct clusters at the same generation

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

  // Place root + its same-gen spouse(s) at x = 0.
  const rootCluster = [rootId, ...Array.from(spouses.get(rootId) ?? []).filter((s) => generation.get(s) === 0)]
  let cx = 0
  for (const id of rootCluster) {
    position.set(id, { x: cx, y: 0 })
    cx += NODE_W + X_TIGHT
  }

  // Same-gen siblings of root (no spouse linking) placed after, then before root if needed.
  const sib0 = Array.from(siblings.get(rootId) ?? []).filter((s) => generation.get(s) === 0 && !position.has(s))
  for (const id of sib0) {
    position.set(id, { x: cx, y: 0 })
    cx += NODE_W + X_TIGHT
  }

  // Walk other generations outward, closest to root first.
  const sortedGens = Array.from(byGen.keys()).sort((a, b) => Math.abs(a) - Math.abs(b))

  // Compute couple groups for a generation: greedy pair-up of spouses at same gen.
  const buildClusters = (gen: number): string[][] => {
    const ids = (byGen.get(gen) ?? []).filter((id) => !position.has(id))
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
      clusters.push(cluster)
    }
    return clusters
  }

  // Anchor for a cluster = average x of placed neighbors (parents for descendants, children for ancestors).
  const clusterAnchor = (cluster: string[]): number | null => {
    const xs: number[] = []
    for (const id of cluster) {
      const ps = Array.from(parents.get(id)  ?? []).filter((p) => position.has(p))
      const cs = Array.from(children.get(id) ?? []).filter((c) => position.has(c))
      const ss = Array.from(siblings.get(id) ?? []).filter((s) => position.has(s))
      if (ps.length > 0) {
        xs.push(ps.reduce((s, p) => s + position.get(p)!.x, 0) / ps.length)
      } else if (cs.length > 0) {
        xs.push(cs.reduce((s, c) => s + position.get(c)!.x, 0) / cs.length)
      } else if (ss.length > 0) {
        xs.push(ss.reduce((s, x) => s + position.get(x)!.x, 0) / ss.length + NODE_W + X_TIGHT)
      }
    }
    if (xs.length === 0) return null
    return xs.reduce((s, x) => s + x, 0) / xs.length
  }

  for (const gen of sortedGens) {
    if (gen === 0) continue
    const y = gen * Y_GEN
    const clusters = buildClusters(gen)
    const withAnchor = clusters.map((c) => ({ c, anchor: clusterAnchor(c) ?? 0 }))
    withAnchor.sort((a, b) => a.anchor - b.anchor)

    let lastRight = -Infinity
    for (const { c, anchor } of withAnchor) {
      const width = c.length * NODE_W + (c.length - 1) * X_TIGHT
      let leftX = anchor - width / 2 + NODE_W / 2
      // Hmm — anchor is a parent/child x (top-left); we want the cluster centered relative to its anchor's center.
      // Actually, anchor here is treated as the anchor's x (top-left). Adjust to center the cluster on that anchor:
      leftX = anchor - (width - NODE_W) / 2
      if (leftX < lastRight + X_FAMILY) leftX = lastRight + X_FAMILY
      let px = leftX
      for (const id of c) {
        position.set(id, { x: px, y })
        px += NODE_W + X_TIGHT
      }
      lastRight = leftX + width
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
      coupleLines.push({ aId: r.fromId, bId: r.toId, subtype: r.subtype ?? "married" })
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
