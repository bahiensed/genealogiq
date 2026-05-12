'use client'

import { Fragment } from "react"
import type { LaidNode, ParentLineGeom, CoupleLineGeom, SiblingLineGeom } from "../layout"
import { NODE_W, NODE_H, Y_GEN } from "../layout"
import { parentStyle, spouseStyle, siblingStyle } from "./edge-style"

interface Props {
  nodes:        LaidNode[]
  parentLines:  ParentLineGeom[]
  coupleLines:  CoupleLineGeom[]
  siblingLines: SiblingLineGeom[]
}

interface Pos { x: number; y: number }

const TRUNK_OFFSET = 28   // vertical distance below parent before the horizontal trunk

export function FamilyEdges({ nodes, parentLines, coupleLines, siblingLines }: Props) {
  const pos = new Map<string, Pos>()
  for (const n of nodes) pos.set(n.id, { x: n.x, y: n.y })

  // ─── Group parent lines by child to detect T-junctions ─────────────────────
  // For each child, collect all (parentId, subtype). If two parents at same y,
  // draw a single T-junction; otherwise draw a per-parent vertical with elbow.
  const parentsByChild = new Map<string, { parentId: string; subtype: string }[]>()
  for (const p of parentLines) {
    const arr = parentsByChild.get(p.childId) ?? []
    arr.push({ parentId: p.parentId, subtype: p.subtype })
    parentsByChild.set(p.childId, arr)
  }

  // Children grouped by parent-pair signature (sorted ids) → shared trunk per family.
  const familiesByPair = new Map<string, { parents: [string, string]; children: string[]; subtypes: Map<string, string> }>()
  for (const [childId, ps] of parentsByChild.entries()) {
    if (ps.length < 2) continue
    const sortedIds = ps.map((p) => p.parentId).sort()
    const key = sortedIds.join("|")
    const family = familiesByPair.get(key) ?? {
      parents:  [sortedIds[0], sortedIds[1]] as [string, string],
      children: [],
      subtypes: new Map<string, string>(),
    }
    family.children.push(childId)
    // Pick the "stricter" subtype for the edge (adopted/step wins over blood)
    const subKey = ps[0].subtype === "blood" ? ps[1].subtype : ps[0].subtype
    family.subtypes.set(childId, subKey)
    familiesByPair.set(key, family)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <g aria-hidden>
      {/* T-junction families */}
      {Array.from(familiesByPair.values()).map((fam, i) => {
        const pa = pos.get(fam.parents[0])
        const pb = pos.get(fam.parents[1])
        if (!pa || !pb) return null
        const parentY = Math.max(pa.y, pb.y) + NODE_H
        const trunkY  = parentY + TRUNK_OFFSET
        const parentMidX = ((pa.x + NODE_W / 2) + (pb.x + NODE_W / 2)) / 2
        const childPositions = fam.children
          .map((id) => pos.get(id))
          .filter((p): p is Pos => !!p)
        if (childPositions.length === 0) return null

        const childCenters = childPositions.map((p) => p.x + NODE_W / 2)
        const leftX  = Math.min(parentMidX, ...childCenters)
        const rightX = Math.max(parentMidX, ...childCenters)

        // Choose dominant subtype across children for the trunk; per-child stem uses its own.
        const trunkSubtype = fam.subtypes.values().next().value ?? "blood"
        const trunkStyle = parentStyle(trunkSubtype)

        return (
          <Fragment key={`fam-${i}`}>
            {/* Vertical drop from parents' midpoint to trunk */}
            <line
              x1={parentMidX} y1={parentY}
              x2={parentMidX} y2={trunkY}
              stroke={trunkStyle.stroke}
              strokeWidth={trunkStyle.width}
              strokeDasharray={trunkStyle.dashArray}
              strokeLinecap="round"
              fill="none"
            />
            {/* Horizontal trunk */}
            <line
              x1={leftX}  y1={trunkY}
              x2={rightX} y2={trunkY}
              stroke={trunkStyle.stroke}
              strokeWidth={trunkStyle.width}
              strokeDasharray={trunkStyle.dashArray}
              strokeLinecap="round"
              fill="none"
            />
            {/* Vertical stub from trunk down to each child */}
            {fam.children.map((cid) => {
              const cp = pos.get(cid)
              if (!cp) return null
              const stubX = cp.x + NODE_W / 2
              const subStyle = parentStyle(fam.subtypes.get(cid) ?? trunkSubtype)
              return (
                <line
                  key={`stub-${i}-${cid}`}
                  x1={stubX} y1={trunkY}
                  x2={stubX} y2={cp.y}
                  stroke={subStyle.stroke}
                  strokeWidth={subStyle.width}
                  strokeDasharray={subStyle.dashArray}
                  strokeLinecap="round"
                  fill="none"
                />
              )
            })}
          </Fragment>
        )
      })}

      {/* Single-parent edges (children with only one parent in the tree) */}
      {parentLines.map((p, i) => {
        const ps = parentsByChild.get(p.childId)
        if (ps && ps.length >= 2) return null  // handled by T-junction above
        const a = pos.get(p.parentId)
        const b = pos.get(p.childId)
        if (!a || !b) return null
        const ax = a.x + NODE_W / 2
        const bx = b.x + NODE_W / 2
        const ay = a.y + NODE_H
        const by = b.y
        const trunkY = ay + (by - ay) / 2
        const style = parentStyle(p.subtype)
        // Soft S-curve via two corners; if ax==bx, a straight line.
        const d = `M ${ax} ${ay} L ${ax} ${trunkY} L ${bx} ${trunkY} L ${bx} ${by}`
        return (
          <path
            key={`pc-${i}`}
            d={d}
            stroke={style.stroke}
            strokeWidth={style.width}
            strokeDasharray={style.dashArray}
            strokeLinecap="round"
            fill="none"
          />
        )
      })}

      {/* Spouse edges */}
      {coupleLines.map((c, i) => {
        const a = pos.get(c.aId)
        const b = pos.get(c.bId)
        if (!a || !b) return null
        const x1 = a.x + NODE_W
        const y1 = a.y + NODE_H / 2
        const x2 = b.x
        // If they're not adjacent on the same gen, draw a gentle arc
        const style = spouseStyle(c.subtype)
        const sameRow = Math.abs(a.y - b.y) < 4
        const d = sameRow
          ? `M ${Math.min(x1, x2)} ${y1} L ${Math.max(x1, x2)} ${y1}`
          : `M ${a.x + NODE_W / 2} ${a.y + NODE_H} C ${a.x + NODE_W / 2} ${(a.y + b.y) / 2 + Y_GEN / 4} ${b.x + NODE_W / 2} ${(a.y + b.y) / 2 + Y_GEN / 4} ${b.x + NODE_W / 2} ${b.y}`
        return (
          <path
            key={`sp-${i}`}
            d={d}
            stroke={style.stroke}
            strokeWidth={style.width}
            strokeDasharray={style.dashArray}
            strokeLinecap="round"
            fill="none"
          />
        )
      })}

      {/* Sibling edges (only when no shared parent) */}
      {siblingLines.map((s, i) => {
        const a = pos.get(s.aId)
        const b = pos.get(s.bId)
        if (!a || !b) return null
        const x1 = a.x + NODE_W / 2
        const x2 = b.x + NODE_W / 2
        const y1 = a.y + NODE_H / 2
        const style = siblingStyle(s.subtype)
        return (
          <line
            key={`sb-${i}`}
            x1={x1} y1={y1} x2={x2} y2={y1}
            stroke={style.stroke}
            strokeWidth={style.width}
            strokeDasharray={style.dashArray}
            strokeLinecap="round"
          />
        )
      })}
    </g>
  )
}
