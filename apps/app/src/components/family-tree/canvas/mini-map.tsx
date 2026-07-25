'use client'

import { useCallback, useRef } from "react"
import { useTranslations } from "next-intl"
import { useViewport } from "./svg-canvas"
import { NODE_W, NODE_H, type LaidNode } from "./layout"

const MINI_W = 170
const MINI_H = 110
const PAD = 8

interface Props {
  nodes:  LaidNode[]
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
}

/** Small always-visible overview of the whole tree, with a rectangle marking
 *  the main canvas's current visible area — click or drag anywhere on it to
 *  recenter the main view (current zoom level is kept, only pan changes). */
export function MiniMap({ nodes, bounds }: Props) {
  const t = useTranslations("FamilyTree")
  const { viewport, size, focusOn } = useViewport()
  const svgRef = useRef<SVGSVGElement>(null)

  const boundsW = Math.max(1, bounds.maxX - bounds.minX)
  const boundsH = Math.max(1, bounds.maxY - bounds.minY)
  const miniScale = Math.min((MINI_W - PAD * 2) / boundsW, (MINI_H - PAD * 2) / boundsH)

  const toMiniX = useCallback((wx: number) => PAD + (wx - bounds.minX) * miniScale, [bounds.minX, miniScale])
  const toMiniY = useCallback((wy: number) => PAD + (wy - bounds.minY) * miniScale, [bounds.minY, miniScale])

  const panTo = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const wx = bounds.minX + (mx - PAD) / miniScale
    const wy = bounds.minY + (my - PAD) / miniScale
    focusOn(wx, wy, viewport.scale)
  }, [bounds.minX, bounds.minY, miniScale, focusOn, viewport.scale])

  const onPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId)
    panTo(e)
  }, [panTo])

  const onPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!(e.currentTarget as SVGSVGElement).hasPointerCapture(e.pointerId)) return
    panTo(e)
  }, [panTo])

  // Not worth showing for a trivially small tree — nothing to navigate.
  if (nodes.length < 2) return null

  // Visible world-space rect (inverse of the main canvas's transform),
  // projected into mini-map pixels.
  const worldLeft   = -viewport.tx / viewport.scale
  const worldTop    = -viewport.ty / viewport.scale
  const worldRight  = (size.w - viewport.tx) / viewport.scale
  const worldBottom = (size.h - viewport.ty) / viewport.scale
  const rectX = toMiniX(worldLeft)
  const rectY = toMiniY(worldTop)
  const rectW = Math.max(2, toMiniX(worldRight) - rectX)
  const rectH = Math.max(2, toMiniY(worldBottom) - rectY)

  return (
    <svg
      ref={svgRef}
      width={MINI_W}
      height={MINI_H}
      data-no-pan
      role="img"
      aria-label={t("controls.miniMap")}
      className="shrink-0 rounded-lg border border-border/60 bg-background/80 backdrop-blur-md shadow-sm cursor-crosshair touch-none"
      style={{ touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
    >
      <title>{t("controls.miniMap")}</title>
      {nodes.map((n) => (
        <circle
          key={n.id}
          cx={toMiniX(n.x + NODE_W / 2)}
          cy={toMiniY(n.y + NODE_H / 2)}
          r={n.isDuplicate ? 1 : 1.6}
          className={n.isDuplicate ? "fill-muted-foreground/40" : "fill-primary/70"}
        />
      ))}
      <rect
        x={rectX}
        y={rectY}
        width={rectW}
        height={rectH}
        className="fill-primary/10 stroke-primary"
        strokeWidth={1.25}
      />
    </svg>
  )
}
