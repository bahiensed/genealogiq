'use client'

import { BaseEdge, EdgeLabelRenderer, getStraightPath, type EdgeProps } from "@xyflow/react"
import { Heart } from "lucide-react"

export function SpouseEdge({ id, sourceX, sourceY, targetX, targetY, style }: EdgeProps) {
  const [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY })

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} />
      <EdgeLabelRenderer>
        <div
          className="absolute pointer-events-none nodrag nopan"
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
        >
          <span className="flex items-center justify-center h-5 w-5 rounded-full bg-card border border-border/50 shadow-sm">
            <Heart className="h-2.5 w-2.5 text-rose-400 fill-rose-400" />
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
