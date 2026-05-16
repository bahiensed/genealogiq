// Family-tree layout — rewrite based on family-unit rigidity (Buchheim et al.
// 2002, adapted). The core insight: lay out every level as a sequence of
// FAMILY UNITS (couples + their children) rather than individual people. A
// family unit is the rigid block; we never sort across unit boundaries.
//
// Pipeline:
//   1. buildFamilyGraph(persons, relations)               (see ./family-units)
//   2. computeDescendantSubtree(rootId) — recursive, bottom-up:
//        returns subtree positions relative to the root's centerX,
//        plus the [leftX, rightX] extent. Subject's sibling row at gen=0 is
//        a *forest* of subtrees combined side-by-side.
//   3. computeAncestorSubtree(parentId, gen) — recursive, going up:
//        returns positions relative to the focal-parent centerX. Paternal
//        and maternal ancestor blocks flank the parent couple symmetrically.
//   4. Stitch the descendant forest + ancestor forest around the subject.
//   5. Build edge geometry arrays and bounds from the placed positions.
//
// v1 limitations (out of scope here, documented for later upgrades):
//   - Extras at gen <= -2 (great-aunts/uncles, etc.) render as couple slots
//     only — their own descendants are not shown to keep deep generations
//     compact. gen=-1 aunts/uncles still render with their cousin subtree.
//   - Multi-marriage is supported for the subject (gen=0) and the subject's
//     parents (gen=-1) via half-blocks; deeper levels still fold non-primary
//     marriages into the active spouse.
//   - Half-siblings emerge naturally from per-unit `children` lists — the
//     SIBLING-line emitter still treats explicit cross-unit SIBLING relations
//     uniformly (no dashed-line distinction yet; that's a v2 polish).

import type { TreePerson, TreeRelation } from "@/queries/family-tree"
import { buildFamilyGraph, type FamilyGraph, type FamilyUnit } from "./family-units"

// ─── Constants (unchanged from the previous layout) ─────────────────────────

export const NODE_W    = 168
export const NODE_H    = 72
export const Y_GEN     = 140
export const X_TIGHT   = 24   // gap inside a couple
export const X_SIBLING = 40   // gap between siblings of the same parents
export const X_FAMILY  = 64   // gap between unrelated family blocks at the same level

// ─── Output types (unchanged shape) ─────────────────────────────────────────

export interface LaidNode {
  id: string
  x:  number
  y:  number
}

export interface ParentLineGeom {
  parentId: string
  childId:  string
  subtype:  string
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

// ─── Block: a placed subtree, anchor at x=0 ─────────────────────────────────

interface Block {
  /** Person → {x, y} relative to the block's anchor (anchor.x = 0). */
  positions: Map<string, { x: number; y: number }>
  /** Horizontal extent of the block (relative to anchor=0). */
  leftX:  number
  rightX: number
}

const emptyBlock = (): Block => ({ positions: new Map(), leftX: 0, rightX: 0 })

/** Translate every position in a block by `dx`. Mutates and returns. */
function shiftBlock(b: Block, dx: number): Block {
  for (const p of b.positions.values()) p.x += dx
  b.leftX  += dx
  b.rightX += dx
  return b
}

/** Merge `right` into `left` (assumes both have positions in the same coord space). */
function mergeBlocks(left: Block, right: Block): Block {
  for (const [id, pos] of right.positions.entries()) left.positions.set(id, pos)
  left.leftX  = Math.min(left.leftX,  right.leftX)
  left.rightX = Math.max(left.rightX, right.rightX)
  return left
}

/** Place `right` to the right of `left` with `gap`. Translates `right` accordingly. */
function placeRightOf(left: Block, right: Block, gap: number): Block {
  const dx = left.rightX + gap - right.leftX
  shiftBlock(right, dx)
  return mergeBlocks(left, right)
}

// ─── Couple slot (single person OR couple of 2) ─────────────────────────────

interface CoupleSlot {
  /** Cards in left-to-right order — 1 or 2 ids. */
  cards: string[]
  /** x of the LEFT card relative to the slot anchor. */
  leftCardX: number
  /** The "focal" person inside the couple (the one whose ancestors/descendants we follow). */
  focalId: string
  /** Width of the slot in pixels. */
  width: number
}

/** Build a couple slot for a focal person, ordered older-leftmost.
 *  Returns slot + the anchor position (focal's card center). */
function buildCoupleSlot(
  focalId:  string,
  graph:    FamilyGraph,
  persons:  Record<string, TreePerson>,
  // If provided, force pairing with this specific spouse. Otherwise use the active spouse.
  forcedSpouseId?: string | null,
): CoupleSlot {
  const spouseId = forcedSpouseId ?? graph.spouseOf.get(focalId) ?? null
  if (!spouseId || !persons[spouseId]) {
    return { cards: [focalId], leftCardX: 0, focalId, width: NODE_W }
  }
  const ageOf = (id: string) => persons[id]?.birthDate?.getTime() ?? Number.POSITIVE_INFINITY
  const olderLeft = ageOf(focalId) <= ageOf(spouseId)
  const cards = olderLeft ? [focalId, spouseId] : [spouseId, focalId]
  return { cards, leftCardX: 0, focalId, width: 2 * NODE_W + X_TIGHT }
}

function slotToBlock(slot: CoupleSlot, gen: number): Block {
  const positions = new Map<string, { x: number; y: number }>()
  let x = slot.leftCardX
  for (const id of slot.cards) {
    positions.set(id, { x, y: gen * Y_GEN })
    x += NODE_W + X_TIGHT
  }
  return { positions, leftX: slot.leftCardX, rightX: slot.leftCardX + slot.width }
}

// ─── Descendant subtree ─────────────────────────────────────────────────────

/** Lay out a person and all their descendants. Returns a block anchored such
 *  that the focal person's card top-left is at x=0 inside the returned block.
 *  Children are placed centered under the focal couple. */
function layoutDescendantSubtree(
  focalId:  string,
  graph:    FamilyGraph,
  persons:  Record<string, TreePerson>,
  gen:      number,
  visited:  Set<string>,
): Block {
  if (visited.has(focalId)) return emptyBlock()
  visited.add(focalId)

  const slot      = buildCoupleSlot(focalId, graph, persons)
  const slotBlock = slotToBlock(slot, gen)

  // Children come from the focal's marriage unit (NOT spouse's other unit).
  const marriage = graph.marriageUnit.get(focalId)
  if (!marriage || marriage.children.length === 0) return slotBlock

  // Build each child's subtree.
  const childBlocks: Block[] = []
  for (const childId of marriage.children) {
    if (visited.has(childId)) continue
    const cb = layoutDescendantSubtree(childId, graph, persons, gen + 1, visited)
    if (cb.positions.size === 0) continue
    childBlocks.push(cb)
  }
  if (childBlocks.length === 0) return slotBlock

  // Concatenate child blocks horizontally, X_SIBLING between siblings.
  // Each child block anchors at its focal (the child). We just chain them.
  let combined = childBlocks[0]
  for (let i = 1; i < childBlocks.length; i++) {
    combined = placeRightOf(combined, childBlocks[i], X_SIBLING)
  }

  // Center the focal couple over the children block's midpoint, OR put
  // children under the couple's center if the children are narrower.
  // The focal-couple slot's center is at slot.width / 2.
  const childrenMidX = (combined.leftX + combined.rightX) / 2
  const slotCenterX  = slot.width / 2

  // Shift to align slot.center with children.midX in a shared coordinate system.
  // Slot is positioned in slotBlock at [slot.leftCardX..slot.width].
  // We re-anchor: pick the focal couple's center as x=0 in the returned block.
  // Recompute:
  //   slotBlock currently has left=0, right=slot.width.
  //   We want slot.center at 0 → shift slotBlock by -slotCenterX.
  shiftBlock(slotBlock, -slotCenterX)
  //   combined currently has leftX..rightX with the first child's slot left at 0.
  //   We want combined.midX at 0 → shift by -childrenMidX.
  shiftBlock(combined, -childrenMidX)

  // Merge and return — both blocks are now centered on x=0.
  return mergeBlocks(slotBlock, combined)
}

// ─── Ancestor subtree ───────────────────────────────────────────────────────

/** Lay out the focal person + all their ancestors going UP. Returns a block
 *  anchored such that the focal's card top-left sits at x=0 (NOT centered on
 *  the couple — we anchor on the focal individual so the caller can stitch
 *  multiple branches under a couple precisely). */
function layoutAncestorSubtreeIndividual(
  focalId:  string,
  graph:    FamilyGraph,
  persons:  Record<string, TreePerson>,
  gen:      number,
  visited:  Set<string>,
): Block {
  if (visited.has(focalId)) return emptyBlock()
  visited.add(focalId)

  // Focal-only slot (a single card; the couple is built one level down by the caller).
  const block = new Map<string, { x: number; y: number }>()
  block.set(focalId, { x: 0, y: gen * Y_GEN })
  const focalBlock: Block = { positions: block, leftX: 0, rightX: NODE_W }

  const birth = graph.birthUnit.get(focalId)
  if (!birth || birth.parents.length === 0) return focalBlock

  // Build the parents-couple block at gen-1.
  // parents are sorted by age in buildCoupleSlot semantics: older left.
  const parentsCoupleBlock = layoutAncestorCoupleBlock(
    birth.parents,
    graph,
    persons,
    gen - 1,
    visited,
  )

  // Center the parents block over the focal's card center.
  const focalCenterX = NODE_W / 2
  const parentsCenterX = (parentsCoupleBlock.leftX + parentsCoupleBlock.rightX) / 2
  shiftBlock(parentsCoupleBlock, focalCenterX - parentsCenterX)

  return mergeBlocks(focalBlock, parentsCoupleBlock)
}

/** Lay out a parents couple plus their ancestors. The couple's cards live at
 *  the given `gen`. The block anchors so that the couple's center is at x=0. */
function layoutAncestorCoupleBlock(
  parents:  string[],
  graph:    FamilyGraph,
  persons:  Record<string, TreePerson>,
  gen:      number,
  visited:  Set<string>,
): Block {
  // Single parent — fall back to the individual case.
  if (parents.length === 1) {
    return layoutAncestorSubtreeIndividual(parents[0], graph, persons, gen, visited)
  }

  // Two parents: order older-leftmost.
  const ageOf = (id: string) => persons[id]?.birthDate?.getTime() ?? Number.POSITIVE_INFINITY
  const [husbandId, wifeId] = parents[0] === parents[1]
    ? parents
    : (ageOf(parents[0]) <= ageOf(parents[1]) ? [parents[0], parents[1]] : [parents[1], parents[0]])

  // Recursively layout each parent's ancestor tree. Each returns a block
  // anchored on the parent's own card (top-left at x=0 in that block).
  const husbandBlock = layoutAncestorSubtreeIndividual(husbandId, graph, persons, gen, new Set(visited))
  const wifeBlock    = layoutAncestorSubtreeIndividual(wifeId,    graph, persons, gen, new Set(visited))
  // (We pass separate visited sets so each side gets to recurse independently.)
  // Mark the actual parents as visited in the shared set to avoid loops elsewhere.
  visited.add(husbandId)
  visited.add(wifeId)

  // Position the two blocks so the husband's card is to the left of the wife's
  // card with X_TIGHT gap (couple connector). The husbandBlock's focal card
  // is at x=0 inside it; the wifeBlock similarly. We need:
  //   husbandCard.x = -NODE_W/2 - X_TIGHT/2   (couple center at x=0)
  //   wifeCard.x    =  NODE_W/2 + X_TIGHT/2
  // So shift husbandBlock so that the focal card's left edge ends at
  // -NODE_W - X_TIGHT/2, and the wifeBlock so its focal card's left edge is
  // at +X_TIGHT/2.

  const husbandTargetX = -(NODE_W + X_TIGHT / 2)   // top-left of husband's card
  const wifeTargetX    = X_TIGHT / 2                // top-left of wife's card

  // Current focal x in each block is 0.
  shiftBlock(husbandBlock, husbandTargetX)
  shiftBlock(wifeBlock,    wifeTargetX)

  // If the two blocks overlap (husband's rightX > wife's leftX), push them
  // outward symmetrically.
  const overlap = husbandBlock.rightX + X_FAMILY - wifeBlock.leftX
  if (overlap > 0) {
    const half = overlap / 2
    shiftBlock(husbandBlock, -half)
    shiftBlock(wifeBlock,     half)
  }

  return mergeBlocks(husbandBlock, wifeBlock)
}

// ─── Half-marriage block ────────────────────────────────────────────────────
//
// Used when a person has more than one marriage. The "primary" marriage is
// rendered by layoutDescendantSubtree (active spouse + children below). For
// every NON-primary marriage we emit a half-block: just the OTHER spouse at
// `gen` plus their joint children at gen+1, rendered as full descendant
// subtrees. The block anchors with the other spouse's card at x=0, and the
// children are centered under that card. The couple connector itself, and the
// PARENT_OF lines from the central person to the half-children, are drawn by
// the edge pass at the end.

function layoutHalfMarriageBlock(
  otherSpouseId: string,
  unit:          FamilyUnit,
  gen:           number,
  graph:         FamilyGraph,
  persons:       Record<string, TreePerson>,
  visited:       Set<string>,
): Block {
  if (visited.has(otherSpouseId)) return emptyBlock()
  visited.add(otherSpouseId)

  const positions = new Map<string, { x: number; y: number }>()
  positions.set(otherSpouseId, { x: 0, y: gen * Y_GEN })
  let block: Block = { positions, leftX: 0, rightX: NODE_W }

  if (unit.children.length === 0) return block

  const childBlocks: Block[] = []
  for (const childId of unit.children) {
    const cb = layoutDescendantSubtree(childId, graph, persons, gen + 1, visited)
    if (cb.positions.size > 0) childBlocks.push(cb)
  }
  if (childBlocks.length === 0) return block

  let kids = childBlocks[0]
  for (let i = 1; i < childBlocks.length; i++) {
    kids = placeRightOf(kids, childBlocks[i], X_SIBLING)
  }
  const childrenMidX = (kids.leftX + kids.rightX) / 2
  shiftBlock(kids, NODE_W / 2 - childrenMidX)

  return mergeBlocks(block, kids)
}

// ─── Top-level orchestration ────────────────────────────────────────────────

export function computeLayout(
  persons:   Record<string, TreePerson>,
  relations: TreeRelation[],
  rootId:    string,
): LayoutResult {
  const graph = buildFamilyGraph(persons, relations)

  // BFS to derive `generation` (still useful for downstream consumers + ancestor
  // tree-header stats). Same rule as before: parent = -1, child = +1, spouse/sibling = 0.
  const generation = new Map<string, number>()
  if (persons[rootId]) {
    generation.set(rootId, 0)
    const queue: string[] = [rootId]
    while (queue.length > 0) {
      const id = queue.shift()!
      const gen = generation.get(id)!
      const bu = graph.birthUnit.get(id)
      if (bu) for (const p of bu.parents) if (!generation.has(p)) { generation.set(p, gen - 1); queue.push(p) }
      const mu = graph.marriageUnit.get(id)
      if (mu) for (const c of mu.children) if (!generation.has(c)) { generation.set(c, gen + 1); queue.push(c) }
      const sp = graph.spouseOf.get(id)
      if (sp && !generation.has(sp)) { generation.set(sp, gen); queue.push(sp) }
      const sibs = graph.siblingsOf.get(id) ?? []
      for (const s of sibs) if (!generation.has(s)) { generation.set(s, gen); queue.push(s) }
    }
  }

  // 1. Descendant subtree from the subject.
  const visited = new Set<string>()
  const descendantBlock = layoutDescendantSubtree(rootId, graph, persons, 0, visited)

  // The descendant block anchors on the subject's couple center at x=0.
  // We'll keep that as the global origin (subject couple center at x=0, y=0).

  // 2. Sibling row at gen=0: subject's siblings (with their spouses), age-sorted.
  //    Distribute across the descendant block:
  //      - siblings older than subject → place LEFT of the descendant block
  //      - siblings younger than subject → place RIGHT
  const ageOf = (id: string) => persons[id]?.birthDate?.getTime() ?? Number.POSITIVE_INFINITY
  const siblings = (graph.siblingsOf.get(rootId) ?? [])
    .filter((id) => persons[id])
    .sort((a, b) => ageOf(a) - ageOf(b))
  const subjectAge = ageOf(rootId)

  let combined = descendantBlock

  // 1b. Subject's OTHER marriages → render each other spouse + their children
  //     as a half-block adjacent to the primary couple, on the side opposite
  //     to the primary spouse. Subject's full siblings (step 2) will then sit
  //     beyond the half-marriages.
  const subjectMarriages = graph.marriageUnits.get(rootId) ?? []
  const subjectPrimary   = graph.marriageUnit.get(rootId) ?? null
  const subjectOthers    = subjectMarriages.filter((u) => u !== subjectPrimary)
  if (subjectOthers.length > 0) {
    const primarySpouseId  = subjectPrimary?.parents.find((p) => p !== rootId)
    const primarySpousePos = primarySpouseId ? combined.positions.get(primarySpouseId) : null
    const focalPos         = combined.positions.get(rootId)
    // If primary spouse sits on the RIGHT (focal older), others go LEFT, and
    // vice versa. Default LEFT when there's no primary spouse to compare.
    const othersOnLeft = primarySpousePos && focalPos
      ? primarySpousePos.x > focalPos.x
      : true
    for (const unit of subjectOthers) {
      const otherSpouseId = unit.parents.find((p) => p !== rootId)
      if (!otherSpouseId) continue
      const halfBlock = layoutHalfMarriageBlock(otherSpouseId, unit, 0, graph, persons, visited)
      if (halfBlock.positions.size === 0) continue
      if (othersOnLeft) {
        const dx = combined.leftX - X_FAMILY - halfBlock.rightX
        shiftBlock(halfBlock, dx)
        combined = mergeBlocks(combined, halfBlock)
      } else {
        combined = placeRightOf(combined, halfBlock, X_FAMILY)
      }
    }
  }

  // Older siblings (left of subject)
  for (let i = siblings.length - 1; i >= 0; i--) {
    const sib = siblings[i]
    if (ageOf(sib) > subjectAge) continue
    const sibBlock = layoutDescendantSubtree(sib, graph, persons, 0, visited)
    if (sibBlock.positions.size === 0) continue
    // Place sibBlock LEFT of combined with X_FAMILY gap.
    const dx = combined.leftX - X_FAMILY - sibBlock.rightX
    shiftBlock(sibBlock, dx)
    combined = mergeBlocks(combined, sibBlock)
  }
  // Younger siblings (right of subject)
  for (const sib of siblings) {
    if (ageOf(sib) <= subjectAge) continue
    const sibBlock = layoutDescendantSubtree(sib, graph, persons, 0, visited)
    if (sibBlock.positions.size === 0) continue
    combined = placeRightOf(combined, sibBlock, X_FAMILY)
  }

  // 3. Ancestor side: subject's parents couple + their ancestors.
  const subjectBirth = graph.birthUnit.get(rootId)
  if (subjectBirth && subjectBirth.parents.length > 0) {
    const parentsBlock = layoutAncestorCoupleBlock(subjectBirth.parents, graph, persons, -1, visited)
    // The parents block is anchored on the parents-couple center at x=0.
    // We want to center it over the SUBJECT's birth-family sibling row — i.e.
    // the midpoint of subject + subject's siblings. That's the midpoint of the
    // combined block we've built so far for gen=0.
    // For now, simpler: center over the subject couple's center (x=0).
    // This means the parents couple is centered above the subject couple.
    // If subject has siblings, they extend to the side; the parents stay above
    // the subject. This matches the user's "subject is the focus" convention.
    combined = mergeBlocks(combined, parentsBlock)

    // 3b. Parents' OTHER marriages → subject's half-siblings. For each parent
    //     in the central couple, render any non-subjectBirth marriage as a
    //     half-block (other spouse at gen=-1 + their joint children at gen=0)
    //     placed adjacent to the parent on the outer side.
    for (const parentId of subjectBirth.parents) {
      const allMarriages = graph.marriageUnits.get(parentId) ?? []
      const otherUnits   = allMarriages.filter((u) => u !== subjectBirth)
      if (otherUnits.length === 0) continue
      const partnerInCouple = subjectBirth.parents.find((p) => p !== parentId)
      const parentPos  = combined.positions.get(parentId)
      const partnerPos = partnerInCouple ? combined.positions.get(partnerInCouple) : null
      const onLeft = parentPos && partnerPos
        ? parentPos.x < partnerPos.x
        : true
      for (const unit of otherUnits) {
        const otherSpouseId = unit.parents.find((p) => p !== parentId)
        if (!otherSpouseId) continue
        const halfBlock = layoutHalfMarriageBlock(otherSpouseId, unit, -1, graph, persons, visited)
        if (halfBlock.positions.size === 0) continue
        if (onLeft) {
          const dx = combined.leftX - X_FAMILY - halfBlock.rightX
          shiftBlock(halfBlock, dx)
          combined = mergeBlocks(combined, halfBlock)
        } else {
          combined = placeRightOf(combined, halfBlock, X_FAMILY)
        }
      }
    }

    // Add gen=-1 sibling row (aunts/uncles): siblings of each parent that are
    // NOT in the central couple. Each extra renders its full descendant
    // subtree, so subject's cousins appear at gen=0 under their aunt/uncle.
    for (const parentId of subjectBirth.parents) {
      const auntsUncles = (graph.siblingsOf.get(parentId) ?? []).filter((id) => persons[id])
      const partnerInCouple = subjectBirth.parents.find((p) => p !== parentId)
      // Decide which side this extra lives on:
      //   parent is on the LEFT of the couple → siblings extend further LEFT
      //   parent is on the RIGHT of the couple → siblings extend further RIGHT
      const parentPos = combined.positions.get(parentId)
      const partnerPos = partnerInCouple ? combined.positions.get(partnerInCouple) : null
      const onLeft = parentPos && partnerPos
        ? parentPos.x < partnerPos.x
        : true   // default left if single parent
      // Sort the extras by age (oldest first).
      auntsUncles.sort((a, b) => ageOf(a) - ageOf(b))
      // When extras live on the LEFT we want the oldest furthest from the parent
      // couple, so iterate youngest-first (and prepend to the left repeatedly).
      const iterOrder = onLeft ? [...auntsUncles].reverse() : auntsUncles

      for (const auId of iterOrder) {
        if (visited.has(auId)) continue
        const auBlock = layoutDescendantSubtree(auId, graph, persons, -1, visited)
        if (auBlock.positions.size === 0) continue
        if (onLeft) {
          const dx = combined.leftX - X_FAMILY - auBlock.rightX
          shiftBlock(auBlock, dx)
          combined = mergeBlocks(combined, auBlock)
        } else {
          combined = placeRightOf(combined, auBlock, X_FAMILY)
        }
        const sp = graph.spouseOf.get(auId)
        if (sp) visited.add(sp)
      }
    }

    // Add extras at gen <= -2 (great-aunts/uncles and deeper). Each extra is
    // rendered as a couple slot only — no descendants — to keep deep branches
    // compact and avoid pulling cousins-of-grandparents into the subject row.
    // Side is decided per-ancestor by x sign: x<0 → paternal/left, x>=0 → maternal/right.
    const ancestorsByGen = new Map<number, string[]>()
    for (const [id, pos] of combined.positions.entries()) {
      const g = Math.round(pos.y / Y_GEN)
      if (g > -2) continue
      const arr = ancestorsByGen.get(g) ?? []
      arr.push(id)
      ancestorsByGen.set(g, arr)
    }
    const ancestorGens = Array.from(ancestorsByGen.keys()).sort((a, b) => b - a)   // -2, -3, ...
    for (const g of ancestorGens) {
      const ancIds = ancestorsByGen.get(g)!
      // Process left-side ancestors first (paternal column), then right-side.
      // Within a side, iterate by x to keep placement deterministic: the
      // ancestor closer to the centre is processed first so its siblings land
      // adjacent to it, and farther-out ancestors push beyond.
      const onLeft  = ancIds.filter((id) => (combined.positions.get(id)!.x) <  0)
                            .sort((a, b) => (combined.positions.get(b)!.x) - (combined.positions.get(a)!.x))
      const onRight = ancIds.filter((id) => (combined.positions.get(id)!.x) >= 0)
                            .sort((a, b) => (combined.positions.get(a)!.x) - (combined.positions.get(b)!.x))

      for (const ancId of onLeft) {
        const sibs = (graph.siblingsOf.get(ancId) ?? []).filter((id) => persons[id])
        sibs.sort((a, b) => ageOf(a) - ageOf(b))
        // Place oldest furthest from focal by iterating youngest-first.
        for (const sibId of [...sibs].reverse()) {
          if (visited.has(sibId)) continue
          const slot = buildCoupleSlot(sibId, graph, persons)
          const slotBlock = slotToBlock(slot, g)
          const dx = combined.leftX - X_SIBLING - slotBlock.rightX
          shiftBlock(slotBlock, dx)
          combined = mergeBlocks(combined, slotBlock)
          visited.add(sibId)
          const sp = graph.spouseOf.get(sibId)
          if (sp) visited.add(sp)
        }
      }
      for (const ancId of onRight) {
        const sibs = (graph.siblingsOf.get(ancId) ?? []).filter((id) => persons[id])
        sibs.sort((a, b) => ageOf(a) - ageOf(b))
        for (const sibId of sibs) {
          if (visited.has(sibId)) continue
          const slot = buildCoupleSlot(sibId, graph, persons)
          const slotBlock = slotToBlock(slot, g)
          combined = placeRightOf(combined, slotBlock, X_SIBLING)
          visited.add(sibId)
          const sp = graph.spouseOf.get(sibId)
          if (sp) visited.add(sp)
        }
      }
    }
  }

  // 4. Build LaidNode[] + bounds.
  const nodes: LaidNode[] = []
  let minX =  Infinity, maxX = -Infinity, minY =  Infinity, maxY = -Infinity
  for (const [id, p] of combined.positions.entries()) {
    nodes.push({ id, x: p.x, y: p.y })
    if (p.x         < minX) minX = p.x
    if (p.x + NODE_W > maxX) maxX = p.x + NODE_W
    if (p.y         < minY) minY = p.y
    if (p.y + NODE_H > maxY) maxY = p.y + NODE_H
  }
  if (!Number.isFinite(minX)) { minX = 0; maxX = NODE_W; minY = 0; maxY = NODE_H }

  // 5. Edge geometry — derived from raw relations, same shape as the old layout.
  const parentLines:  ParentLineGeom[]  = []
  const coupleLines:  CoupleLineGeom[]  = []
  const siblingLines: SiblingLineGeom[] = []
  const sharedParents = (a: string, b: string): boolean => {
    const pa = graph.birthUnit.get(a)
    const pb = graph.birthUnit.get(b)
    return !!pa && pa === pb
  }
  for (const r of relations) {
    if (r.status === "REJECTED") continue
    if (r.type === "PARENT_OF") {
      parentLines.push({ parentId: r.fromId, childId: r.toId, subtype: r.subtype ?? "blood" })
    } else if (r.type === "SPOUSE") {
      coupleLines.push({ aId: r.fromId, bId: r.toId, subtype: r.subtype ?? "married", endDate: r.endDate })
    } else if (r.type === "SIBLING") {
      // Only emit a SIBLING line when the two people don't share a parent in
      // the tree (the parent-line T-junction would otherwise convey it).
      if (!sharedParents(r.fromId, r.toId)) {
        siblingLines.push({ aId: r.fromId, bId: r.toId, subtype: r.subtype ?? "blood" })
      }
    }
  }

  return {
    nodes,
    parentLines,
    coupleLines,
    siblingLines,
    bounds: { minX, maxX, minY, maxY },
    generation,
  }
}
