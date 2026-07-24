'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

interface Viewport {
  tx:    number
  ty:    number
  scale: number
}

interface ViewportContextValue {
  viewport: Viewport
  /** Container's current pixel size — {0,0} until the first ResizeObserver
   *  tick. Lets overlays (e.g. the mini-map) convert between screen and
   *  world space without re-measuring the DOM themselves. */
  size:     { w: number; h: number }
  zoomBy:   (factor: number) => void
  fitView:  () => void
  focusOn:  (x: number, y: number, scale?: number) => void
}

const ViewportContext = createContext<ViewportContextValue | null>(null)

export function useViewport(): ViewportContextValue {
  const ctx = useContext(ViewportContext)
  if (!ctx) throw new Error("useViewport must be used inside <SvgCanvas>")
  return ctx
}

export const MIN_SCALE = 0.25
export const MAX_SCALE = 2.5
const ZOOM_STEP = 1.2
// Initial zoom is 4 zoom-steps below the maximum.
const INITIAL_SCALE = MAX_SCALE / Math.pow(ZOOM_STEP, 4)
const FALLBACK_VIEWPORT: Viewport = { tx: 0, ty: 0, scale: 1 }

interface SvgCanvasProps {
  bounds:    { minX: number; maxX: number; minY: number; maxY: number }
  /** Pure SVG content (lines, paths) rendered inside <svg><g transform=…>. */
  edges:     ReactNode
  /** HTML content (cards) rendered inside an absolutely-positioned <div> that
   *  carries the SAME transform via CSS. Keeps Safari/WebKit happy — the SVG
   *  foreignObject + transform combo desyncs cards from edges on macOS. */
  nodes:     ReactNode
  overlays?: ReactNode
  className?: string
  // When set, the page-load viewport centers on this point at INITIAL_SCALE
  // instead of fitting the whole tree.
  initialTarget?: { x: number; y: number } | null
}

export function SvgCanvas({ bounds, edges, nodes, overlays, className, initialTarget = null }: SvgCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  // userViewport is set once the user takes any action; until then the
  // viewport is auto-fit derived from current bounds + size.
  const [userViewport, setUserViewport] = useState<Viewport | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    const obs = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight })
    })
    obs.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => obs.disconnect()
  }, [])

  const autoFit = useCallback((): Viewport => {
    if (size.w === 0 || size.h === 0) return FALLBACK_VIEWPORT
    const padding = 0.15
    const w = bounds.maxX - bounds.minX
    const h = bounds.maxY - bounds.minY
    if (w <= 0 || h <= 0) return { tx: size.w / 2, ty: size.h / 2, scale: 1 }
    const scale = Math.min(
      (size.w * (1 - padding * 2)) / w,
      (size.h * (1 - padding * 2)) / h,
      MAX_SCALE,
    )
    const tx = size.w / 2 - ((bounds.minX + bounds.maxX) / 2) * scale
    const ty = size.h / 2 - ((bounds.minY + bounds.maxY) / 2) * scale
    return { tx, ty, scale }
  }, [bounds, size])

  // Page-load viewport: zoomed in (max - 4 steps) on the initial target if provided,
  // otherwise auto-fit the whole tree.
  const initialFit = useCallback((): Viewport => {
    if (size.w === 0 || size.h === 0) return FALLBACK_VIEWPORT
    if (!initialTarget) return autoFit()
    const scale = INITIAL_SCALE
    return {
      scale,
      tx: size.w / 2 - initialTarget.x * scale,
      ty: size.h / 2 - initialTarget.y * scale,
    }
  }, [size, initialTarget, autoFit])

  // Effective viewport — user's if they've interacted, otherwise live initial fit.
  const viewport: Viewport = useMemo(() => userViewport ?? initialFit(), [userViewport, initialFit])

  const fitView = useCallback(() => {
    setUserViewport(autoFit())
  }, [autoFit])

  const focusOn = useCallback((x: number, y: number, scale?: number) => {
    const target = clamp(scale ?? MAX_SCALE, MIN_SCALE, MAX_SCALE)
    setUserViewport({
      scale: target,
      tx:    size.w / 2 - x * target,
      ty:    size.h / 2 - y * target,
    })
  }, [size])

  const zoomBy = useCallback((factor: number) => {
    setUserViewport((prev) => {
      const v = prev ?? autoFit()
      const cx = size.w / 2
      const cy = size.h / 2
      const nextScale = clamp(v.scale * factor, MIN_SCALE, MAX_SCALE)
      const k = nextScale / v.scale
      return {
        scale: nextScale,
        tx:    cx - (cx - v.tx) * k,
        ty:    cy - (cy - v.ty) * k,
      }
    })
  }, [autoFit, size])

  // Pointer state: pan with single pointer; pinch with two pointers.
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map())
  const lastPinch = useRef<{ dist: number; midX: number; midY: number } | null>(null)

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Let clicks on nodes and any interactive HTML overlay (buttons, links, inputs)
    // through — only initiate pan when the surface itself was clicked.
    const t = e.target as HTMLElement
    if (t.closest("[data-node]") || t.closest("button") || t.closest("a") || t.closest("input") || t.closest("[data-no-pan]")) {
      return
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointers.current.size === 1) {
      const dx = e.clientX - prev.x
      const dy = e.clientY - prev.y
      setUserViewport((cur) => {
        const v = cur ?? autoFit()
        return { ...v, tx: v.tx + dx, ty: v.ty + dy }
      })
    } else if (pointers.current.size === 2) {
      const [p1, p2] = Array.from(pointers.current.values())
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
      const midX = (p1.x + p2.x) / 2
      const midY = (p1.y + p2.y) / 2
      if (lastPinch.current) {
        const factor = dist / lastPinch.current.dist
        const dxMid = midX - lastPinch.current.midX
        const dyMid = midY - lastPinch.current.midY
        setUserViewport((cur) => {
          const v = cur ?? autoFit()
          const nextScale = clamp(v.scale * factor, MIN_SCALE, MAX_SCALE)
          const k = nextScale / v.scale
          return {
            scale: nextScale,
            tx:    midX - (midX - v.tx) * k + dxMid,
            ty:    midY - (midY - v.ty) * k + dyMid,
          }
        })
      }
      lastPinch.current = { dist, midX, midY }
    }
  }, [autoFit])

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) lastPinch.current = null
  }, [])

  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    const cx = rect ? e.clientX - rect.left : size.w / 2
    const cy = rect ? e.clientY - rect.top  : size.h / 2
    const factor = 1 - e.deltaY * 0.0015
    setUserViewport((cur) => {
      const v = cur ?? autoFit()
      const nextScale = clamp(v.scale * factor, MIN_SCALE, MAX_SCALE)
      const k = nextScale / v.scale
      return {
        scale: nextScale,
        tx:    cx - (cx - v.tx) * k,
        ty:    cy - (cy - v.ty) * k,
      }
    })
  }, [autoFit, size])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return
      if (e.key === "f") { e.preventDefault(); fitView() }
      else if (e.key === "ArrowLeft")  setUserViewport((v) => ({ ...(v ?? autoFit()), tx: (v?.tx ?? autoFit().tx) + 50 }))
      else if (e.key === "ArrowRight") setUserViewport((v) => ({ ...(v ?? autoFit()), tx: (v?.tx ?? autoFit().tx) - 50 }))
      else if (e.key === "ArrowUp")    setUserViewport((v) => ({ ...(v ?? autoFit()), ty: (v?.ty ?? autoFit().ty) + 50 }))
      else if (e.key === "ArrowDown")  setUserViewport((v) => ({ ...(v ?? autoFit()), ty: (v?.ty ?? autoFit().ty) - 50 }))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [fitView, autoFit])

  const ctxValue = useMemo<ViewportContextValue>(
    () => ({ viewport, size, zoomBy, fitView, focusOn }),
    [viewport, size, zoomBy, fitView, focusOn],
  )

  return (
    <ViewportContext.Provider value={ctxValue}>
      <div
        ref={containerRef}
        className={"absolute inset-0 overflow-hidden touch-none select-none " + (className ?? "")}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ cursor: "grab" }}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ display: "block" }}>
          <g transform={`translate(${viewport.tx} ${viewport.ty}) scale(${viewport.scale})`}>
            {edges}
          </g>
        </svg>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform:       `translate(${viewport.tx}px, ${viewport.ty}px) scale(${viewport.scale})`,
            transformOrigin: "0 0",
          }}
        >
          {nodes}
        </div>
        {overlays}
      </div>
    </ViewportContext.Provider>
  )
}

function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v
}
