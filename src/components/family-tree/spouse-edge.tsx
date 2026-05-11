'use client'

import { BaseEdge, getStraightPath, type EdgeProps } from "@xyflow/react"

export function SpouseEdge({ id, sourceX, sourceY, targetX, targetY, style }: EdgeProps) {
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY })
  return <BaseEdge id={id} path={edgePath} style={style} />
}
