'use client'

import { memo } from "react"
import { BaseEdge, type EdgeProps } from "@xyflow/react"

export type FamilyLinkEdgeData = {
  otherParentX?: number
  startYOverride?: number
  trunkY?: number
  trunkLeftX?: number
  trunkRightX?: number
  active?: boolean
  [key: string]: unknown
}

/**
 * Custom edge that originates from the midpoint between two parents
 * (on the spouse line) and routes down to the child's top handle.
 *
 * Forms a "T" / "⊥" connecting all siblings:
 *   1. Vertical drop from parent-midpoint down to a shared trunk Y.
 *   2. Horizontal trunk spanning from leftmost sibling X to rightmost sibling X.
 *   3. Vertical down-stub from trunk to this child.
 */
const FamilyLinkEdgeComponent = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps) => {
  const {
    otherParentX,
    startYOverride,
    trunkY,
    trunkLeftX,
    trunkRightX,
    active = true,
  } = (data ?? {}) as FamilyLinkEdgeData

  const startX = otherParentX != null ? (sourceX + otherParentX) / 2 : sourceX
  const startY = startYOverride ?? sourceY
  const midY = trunkY ?? startY + (targetY - startY) / 2

  const leftX  = Math.min(trunkLeftX  ?? targetX, startX, targetX)
  const rightX = Math.max(trunkRightX ?? targetX, startX, targetX)

  const path = [
    `M ${startX},${startY}`,
    `L ${startX},${midY}`,
    `M ${leftX},${midY}`,
    `L ${rightX},${midY}`,
    `M ${targetX},${midY}`,
    `L ${targetX},${targetY}`,
  ].join(" ")

  return (
    <BaseEdge
      id={id}
      path={path}
      style={{
        stroke: "url(#ft-edge-parent)",
        strokeWidth: 1.75,
        fill: "none",
        strokeLinecap: "round",
        opacity: active ? 1 : 0.18,
        transition: "opacity 300ms",
      }}
    />
  )
}

export const FamilyLinkEdge = memo(FamilyLinkEdgeComponent)
