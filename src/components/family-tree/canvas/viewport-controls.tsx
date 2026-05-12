'use client'

import { Minus, Plus, Maximize2 } from "lucide-react"
import { useViewport } from "./svg-canvas"

export function ViewportControls() {
  const { zoomBy, fitView } = useViewport()
  return (
    <div className="absolute bottom-4 left-4 z-10 flex flex-col rounded-xl border border-border/60 bg-background/80 backdrop-blur-md shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => zoomBy(1.2)}
        className="h-9 w-9 inline-flex items-center justify-center hover:bg-accent/60 transition-colors"
        aria-label="Zoom in"
      >
        <Plus className="h-4 w-4" />
      </button>
      <div className="h-px bg-border/60" />
      <button
        type="button"
        onClick={() => zoomBy(1 / 1.2)}
        className="h-9 w-9 inline-flex items-center justify-center hover:bg-accent/60 transition-colors"
        aria-label="Zoom out"
      >
        <Minus className="h-4 w-4" />
      </button>
      <div className="h-px bg-border/60" />
      <button
        type="button"
        onClick={fitView}
        className="h-9 w-9 inline-flex items-center justify-center hover:bg-accent/60 transition-colors"
        aria-label="Fit view"
        title="Fit view (F)"
      >
        <Maximize2 className="h-4 w-4" />
      </button>
    </div>
  )
}
