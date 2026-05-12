'use client'

import { Plus } from "lucide-react"
import { NODE_W, NODE_H } from "./layout"

type Kind = "parent" | "child" | "spouse" | "sibling"

interface Props {
  x:        number
  y:        number
  onAdd:    (kind: Kind) => void
}

const HIT = 22  // diameter of the "+" button hit area

export function QuickAddOverlay({ x, y, onAdd }: Props) {
  const cx = x + NODE_W / 2
  const cy = y + NODE_H / 2

  const buttons: Array<{ kind: Kind; bx: number; by: number; title: string }> = [
    { kind: "parent",  bx: cx,                 by: y - HIT / 2,       title: "Add parent" },
    { kind: "child",   bx: cx,                 by: y + NODE_H + HIT / 2, title: "Add child" },
    { kind: "sibling", bx: x - HIT / 2,        by: cy,                title: "Add sibling" },
    { kind: "spouse",  bx: x + NODE_W + HIT / 2, by: cy,              title: "Add spouse" },
  ]

  return (
    <g>
      {buttons.map((b) => (
        <foreignObject key={b.kind} x={b.bx - HIT / 2} y={b.by - HIT / 2} width={HIT} height={HIT}>
          <button
            type="button"
            title={b.title}
            onClick={(e) => { e.stopPropagation(); onAdd(b.kind) }}
            className="h-full w-full rounded-full bg-primary text-primary-foreground shadow-md inline-flex items-center justify-center hover:scale-110 transition-transform"
          >
            <Plus className="h-3 w-3" />
          </button>
        </foreignObject>
      ))}
    </g>
  )
}
