'use client'

import { useTranslations } from "next-intl"
import { Minus, Plus, Network, SquareUserRound } from "lucide-react"
import { useViewport } from "./svg-canvas"

interface Props {
  rootCenter?: { x: number; y: number } | null
}

export function ViewportControls({ rootCenter = null }: Props) {
  const t = useTranslations("FamilyTree")
  const { zoomBy, fitView, focusOn } = useViewport()
  return (
    <div className="absolute bottom-4 left-4 z-10 flex flex-col rounded-xl border border-border/60 bg-background/80 backdrop-blur-md shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => zoomBy(1.2)}
        className="h-9 w-9 inline-flex items-center justify-center hover:bg-accent/60 transition-colors"
        aria-label={t("controls.zoomIn")}
        title={t("controls.zoomIn")}
      >
        <Plus className="h-4 w-4" />
      </button>
      <div className="h-px bg-border/60" />
      <button
        type="button"
        onClick={() => zoomBy(1 / 1.2)}
        className="h-9 w-9 inline-flex items-center justify-center hover:bg-accent/60 transition-colors"
        aria-label={t("controls.zoomOut")}
        title={t("controls.zoomOut")}
      >
        <Minus className="h-4 w-4" />
      </button>
      <div className="h-px bg-border/60" />
      <button
        type="button"
        onClick={fitView}
        className="h-9 w-9 inline-flex items-center justify-center hover:bg-accent/60 transition-colors"
        aria-label={t("controls.fitTree")}
        title={t("controls.fitTreeTitle")}
      >
        <Network className="h-4 w-4" />
      </button>
      {rootCenter && (
        <>
          <div className="h-px bg-border/60" />
          <button
            type="button"
            onClick={() => focusOn(rootCenter.x, rootCenter.y)}
            className="h-9 w-9 inline-flex items-center justify-center hover:bg-accent/60 transition-colors"
            aria-label={t("controls.focusRoot")}
            title={t("controls.focusRootTitle")}
          >
            <SquareUserRound className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  )
}
