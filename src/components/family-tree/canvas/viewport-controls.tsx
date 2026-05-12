'use client'

import { Minus, Plus, Maximize, Frame } from "lucide-react"
import { useViewport } from "./svg-canvas"

interface Props {
  rootCenter?: { x: number; y: number } | null
}

export function ViewportControls({ rootCenter = null }: Props) {
  const { zoomBy, fitView, focusOn } = useViewport()
  return (
    <div className="absolute bottom-4 left-4 z-10 flex flex-col rounded-xl border border-border/60 bg-background/80 backdrop-blur-md shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => zoomBy(1.2)}
        className="h-9 w-9 inline-flex items-center justify-center hover:bg-accent/60 transition-colors"
        aria-label="Zoom in"
        title="Zoom in"
      >
        <Plus className="h-4 w-4" />
      </button>
      <div className="h-px bg-border/60" />
      <button
        type="button"
        onClick={() => zoomBy(1 / 1.2)}
        className="h-9 w-9 inline-flex items-center justify-center hover:bg-accent/60 transition-colors"
        aria-label="Zoom out"
        title="Zoom out"
      >
        <Minus className="h-4 w-4" />
      </button>
      <div className="h-px bg-border/60" />
      <button
        type="button"
        onClick={fitView}
        className="h-9 w-9 inline-flex items-center justify-center hover:bg-accent/60 transition-colors"
        aria-label="Fit whole tree"
        title="Fit whole tree (F)"
      >
        <Maximize className="h-4 w-4" />
      </button>
      {rootCenter && (
        <>
          <div className="h-px bg-border/60" />
          <button
            type="button"
            onClick={() => focusOn(rootCenter.x, rootCenter.y)}
            className="h-9 w-9 inline-flex items-center justify-center hover:bg-accent/60 transition-colors"
            aria-label="Focus on root"
            title="Focus on the tree owner"
          >
            <Frame className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  )
}
