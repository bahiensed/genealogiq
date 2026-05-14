"use client"

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

const TRUNK_OFFSET = 28   // vertical distance below parent card before the horizontal trunk

export function FamilyEdges({ nodes, parentLines, coupleLines, siblingLines }: Props) {
  const pos = new Map<string, Pos>()
  for (const n of nodes) pos.set(n.id, { x: n.x, y: n.y })

  // ─── Group parent lines by child (to detect two-parent T-junctions) ──────────
  const parentsByChild = new Map<string, { parentId: string; subtype: string }[]>()
  for (const p of parentLines) {
    const arr = parentsByChild.get(p.childId) ?? []
    arr.push({ parentId: p.parentId, subtype: p.subtype })
    parentsByChild.set(p.childId, arr)
  }

  // ─── Two-parent families: children with exactly two parents ─────────────────
  // Grouped by sorted parent-pair key so multiple children share one trunk.
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
    const subKey = ps[0].subtype === "blood" ? ps[1].subtype : ps[0].subtype
    family.subtypes.set(childId, subKey)
    familiesByPair.set(key, family)
  }

  // ─── Single-parent families: parent with 2+ children ────────────────────────
  // We group by parent; later we render a T-junction only when count >= 2.
  const singleParentGroups = new Map<string, { children: string[]; subtypes: Map<string, string> }>()
  for (const [childId, ps] of parentsByChild.entries()) {
    if (ps.length !== 1) continue
    const { parentId, subtype } = ps[0]
    const group = singleParentGroups.get(parentId) ?? { children: [] as string[], subtypes: new Map<string, string>() }
    group.children.push(childId)
    group.subtypes.set(childId, subtype)
    singleParentGroups.set(parentId, group)
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <g aria-hidden>

      {/* ── Two-parent T-junction families ─────────────────────────────────── */}
      {Array.from(familiesByPair.values()).map((fam, i) => {
        const pa = pos.get(fam.parents[0])
        const pb = pos.get(fam.parents[1])
        if (!pa || !pb) return null

        // Bug-1 fix: start vertical at the couple-line Y (NODE_H/2), not at card bottom.
        // The node card renders on top of edges, hiding the portion inside the card.
        const coupleLineY = Math.max(pa.y, pb.y) + NODE_H / 2
        const trunkY      = Math.max(pa.y, pb.y) + NODE_H + TRUNK_OFFSET
        const parentMidX  = ((pa.x + NODE_W / 2) + (pb.x + NODE_W / 2)) / 2

        const childPositions = fam.children
          .map((id) => pos.get(id))
          .filter((p): p is Pos => !!p)
        if (childPositions.length === 0) return null

        const childCenters = childPositions.map((p) => p.x + NODE_W / 2)
        // Extend trunk to include parentMidX so the vertical always connects.
        const leftX  = Math.min(parentMidX, ...childCenters)
        const rightX = Math.max(parentMidX, ...childCenters)

        const trunkSubtype = fam.subtypes.values().next().value ?? "blood"
        const tStyle = parentStyle(trunkSubtype)

        return (
          <Fragment key={`fam-${i}`}>
            {/* Vertical drop from couple-line midpoint down to trunk */}
            <line
              x1={parentMidX} y1={coupleLineY}
              x2={parentMidX} y2={trunkY}
              stroke={tStyle.stroke} strokeWidth={tStyle.width}
              strokeDasharray={tStyle.dashArray} strokeLinecap="round" fill="none"
            />
            {/* Horizontal trunk */}
            <line
              x1={leftX}  y1={trunkY}
              x2={rightX} y2={trunkY}
              stroke={tStyle.stroke} strokeWidth={tStyle.width}
              strokeDasharray={tStyle.dashArray} strokeLinecap="round" fill="none"
            />
            {/* Vertical stubs from trunk to each child */}
            {fam.children.map((cid) => {
              const cp = pos.get(cid)
              if (!cp) return null
              const stubX    = cp.x + NODE_W / 2
              const subStyle = parentStyle(fam.subtypes.get(cid) ?? trunkSubtype)
              return (
                <line
                  key={`stub-${i}-${cid}`}
                  x1={stubX} y1={trunkY}
                  x2={stubX} y2={cp.y}
                  stroke={subStyle.stroke} strokeWidth={subStyle.width}
                  strokeDasharray={subStyle.dashArray} strokeLinecap="round" fill="none"
                />
              )
            })}
          </Fragment>
        )
      })}

      {/* ── Single-parent T-junctions (parent with 2+ children) ────────────── */}
      {Array.from(singleParentGroups.entries())
        .filter(([, g]) => g.children.length >= 2)
        .map(([parentId, g]) => {
          const pp = pos.get(parentId)
          if (!pp) return null

          const parentCenterX = pp.x + NODE_W / 2
          const trunkY        = pp.y + NODE_H + TRUNK_OFFSET

          const cps = g.children
            .map((id) => pos.get(id))
            .filter((p): p is Pos => !!p)
          const childCenters = cps.map((p) => p.x + NODE_W / 2)
          if (childCenters.length === 0) return null

          // Extend trunk to include parentCenterX so the vertical always connects.
          const leftX  = Math.min(parentCenterX, ...childCenters)
          const rightX = Math.max(parentCenterX, ...childCenters)

          const trunkSubtype = g.subtypes.values().next().value ?? "blood"
          const tStyle = parentStyle(trunkSubtype)

          return (
            <Fragment key={`sp-tj-${parentId}`}>
              {/* Vertical from bottom of parent card to trunk */}
              <line
                x1={parentCenterX} y1={pp.y + NODE_H}
                x2={parentCenterX} y2={trunkY}
                stroke={tStyle.stroke} strokeWidth={tStyle.width}
                strokeDasharray={tStyle.dashArray} strokeLinecap="round" fill="none"
              />
              {/* Horizontal trunk spanning all children */}
              <line
                x1={leftX}  y1={trunkY}
                x2={rightX} y2={trunkY}
                stroke={tStyle.stroke} strokeWidth={tStyle.width}
                strokeDasharray={tStyle.dashArray} strokeLinecap="round" fill="none"
              />
              {/* Vertical stubs from trunk to each child */}
              {g.children.map((cid) => {
                const cp = pos.get(cid)
                if (!cp) return null
                const stubX    = cp.x + NODE_W / 2
                const subStyle = parentStyle(g.subtypes.get(cid) ?? trunkSubtype)
                return (
                  <line
                    key={`sp-stub-${parentId}-${cid}`}
                    x1={stubX} y1={trunkY}
                    x2={stubX} y2={cp.y}
                    stroke={subStyle.stroke} strokeWidth={subStyle.width}
                    strokeDasharray={subStyle.dashArray} strokeLinecap="round" fill="none"
                  />
                )
              })}
            </Fragment>
          )
        })}

      {/* ── Single parent–child S-curves (lone child, no T-junction) ──────── */}
      {parentLines.map((p, i) => {
        // Skip if child has two parents (handled by two-parent T-junction).
        const ps = parentsByChild.get(p.childId)
        if (ps && ps.length >= 2) return null

        // Skip if this parent has multiple children (handled by single-parent T-junction).
        const group = singleParentGroups.get(p.parentId)
        if (group && group.children.length >= 2) return null

        const a = pos.get(p.parentId)
        const b = pos.get(p.childId)
        if (!a || !b) return null

        const ax    = a.x + NODE_W / 2
        const bx    = b.x + NODE_W / 2
        const ay    = a.y + NODE_H
        const by    = b.y
        const midY  = ay + (by - ay) / 2
        const style = parentStyle(p.subtype)
        // Soft L-path (elbow at midpoint); straight line when parent and child are aligned.
        const d = `M ${ax} ${ay} L ${ax} ${midY} L ${bx} ${midY} L ${bx} ${by}`
        return (
          <path
            key={`pc-${i}`}
            d={d}
            stroke={style.stroke} strokeWidth={style.width}
            strokeDasharray={style.dashArray} strokeLinecap="round" fill="none"
          />
        )
      })}

      {/* ── Spouse edges ─────────────────────────────────────────────────────── */}
      {coupleLines.map((c, i) => {
        const a = pos.get(c.aId)
        const b = pos.get(c.bId)
        if (!a || !b) return null

        const x1    = a.x + NODE_W
        const y1    = a.y + NODE_H / 2
        const x2    = b.x
        const style = spouseStyle(c.subtype)
        const sameRow = Math.abs(a.y - b.y) < 4
        const d = sameRow
          ? `M ${Math.min(x1, x2)} ${y1} L ${Math.max(x1, x2)} ${y1}`
          : `M ${a.x + NODE_W / 2} ${a.y + NODE_H} C ${a.x + NODE_W / 2} ${(a.y + b.y) / 2 + Y_GEN / 4} ${b.x + NODE_W / 2} ${(a.y + b.y) / 2 + Y_GEN / 4} ${b.x + NODE_W / 2} ${b.y}`
        return (
          <path
            key={`sp-${i}`}
            d={d}
            stroke={style.stroke} strokeWidth={style.width}
            strokeDasharray={style.dashArray} strokeLinecap="round" fill="none"
          />
        )
      })}

      {/* ── Sibling edges (only when siblings share no parent in the tree) ──── */}
      {siblingLines.map((s, i) => {
        const a = pos.get(s.aId)
        const b = pos.get(s.bId)
        if (!a || !b) return null

        const x1    = a.x + NODE_W / 2
        const x2    = b.x + NODE_W / 2
        const y1    = a.y + NODE_H / 2
        const style = siblingStyle(s.subtype)
        return (
          <line
            key={`sb-${i}`}
            x1={x1} y1={y1} x2={x2} y2={y1}
            stroke={style.stroke} strokeWidth={style.width}
            strokeDasharray={style.dashArray} strokeLinecap="round"
          />
        )
      })}

    </g>
  )
}
