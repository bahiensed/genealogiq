'use client'

import { useCallback, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { User, BookOpen, GitBranch, Plus, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TreePerson } from "@/queries/family-tree"
import { NODE_W, NODE_H } from "./layout"
import { useViewport } from "./svg-canvas"

const DRAG_THRESHOLD_PX = 5

interface Props {
  person:         TreePerson
  x:              number
  y:              number
  isRoot:         boolean
  isSessionUser:  boolean
  isSelected:     boolean
  /** True for the 2nd+ occurrence of a person reachable via two branches
   *  (pedigree collapse, e.g. a cousin marriage) — renders as a de-emphasized
   *  stub with a hint that this is the same person shown elsewhere. */
  isDuplicate?:   boolean
  /** Enables drag-to-reposition (gated to tree managers; never for a
   *  duplicate occurrence — see family-tree-canvas.tsx). */
  draggable?:     boolean
  /** Fired once, on release, with the completed drag's WORLD-space delta —
   *  already past the click-vs-drag threshold. */
  onReposition?:  (dx: number, dy: number) => void
  /** Whether this occurrence has descendants/ancestors that a collapse
   *  toggle could hide — see computeLayout's LaidNode.hasCollapsible. */
  hasCollapsible?:    boolean
  isCollapsed?:       boolean
  collapseDirection?: "up" | "down"
  onToggleCollapse?:  () => void
  /** True when this occurrence sits on the compare tool's currently
   *  highlighted relationship path (including the two endpoints). */
  isOnPath?:          boolean
  /** 1 or 2 when this occurrence is one of the compare tool's two picks. */
  comparePickIndex?:  1 | 2 | null
  onActivate:     () => void
}

export function PersonNode({
  person, x, y, isRoot, isSessionUser, isSelected, isDuplicate, draggable, onReposition,
  hasCollapsible, isCollapsed, collapseDirection, onToggleCollapse,
  isOnPath, comparePickIndex, onActivate,
}: Props) {
  const t = useTranslations("FamilyTree")
  const { viewport } = useViewport()
  const isGhost = person.role === "APP_GHOST"
  const isMemorial = person.role === "APP_MEMO"
  const isPending = person.pending && !isRoot

  // Edges intentionally do NOT live-follow a drag in progress (see
  // family-tree-canvas.tsx) — they snap to the new position once dragState
  // commits via onReposition, matching plenty of prior art (e.g. Trello)
  // rather than lifting per-pointermove state up through the whole canvas.
  const dragState        = useRef<{ startX: number; startY: number; dragging: boolean } | null>(null)
  const suppressClickRef = useRef(false)
  const [dragPreview, setDragPreview] = useState<{ dx: number; dy: number } | null>(null)

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggable) return
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragState.current = { startX: e.clientX, startY: e.clientY, dragging: false }
  }, [draggable])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragState.current
    if (!state) return
    const screenDx = e.clientX - state.startX
    const screenDy = e.clientY - state.startY
    if (!state.dragging) {
      if (Math.hypot(screenDx, screenDy) < DRAG_THRESHOLD_PX) return
      state.dragging = true
    }
    setDragPreview({ dx: screenDx / viewport.scale, dy: screenDy / viewport.scale })
  }, [viewport.scale])

  const handlePointerUp = useCallback(() => {
    const state = dragState.current
    dragState.current = null
    if (!state) return
    if (state.dragging) {
      suppressClickRef.current = true
      setDragPreview((preview) => {
        if (preview) onReposition?.(preview.dx, preview.dy)
        return null
      })
    }
  }, [onReposition])

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    if (suppressClickRef.current) { suppressClickRef.current = false; return }
    onActivate()
  }, [onActivate])

  const ringColor =
    person.gender === "FEMALE"
      ? "ring-rose-300/70"
      : person.gender === "MALE"
        ? "ring-[hsl(var(--brand-indigo)/0.55)]"
        : "ring-border/50"

  const initials = `${person.firstName[0] ?? ""}${person.lastName[0] ?? ""}`.toUpperCase()
  // Read the always-populated year fields directly (not derived from
  // birthDate/deathDate) so a redacted person still shows a year.
  const birthYear = person.birthYear != null ? String(person.birthYear) : ""
  const deathYear = person.deathYear != null ? String(person.deathYear) : ""
  const yearLabel = deathYear ? `${birthYear || "—"} – ${deathYear}` : birthYear

  const displayName = person.maidenName
    ? t("nameWithMaiden", { name: `${person.firstName} ${person.lastName}`, maidenName: person.maidenName })
    : `${person.firstName} ${person.lastName}`

  return (
    <div
      data-node={person.id}
      role="button"
      tabIndex={0}
      aria-label={displayName}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return
        e.preventDefault()
        e.stopPropagation()
        onActivate()
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={cn(
        "absolute rounded-xl border bg-card/85 backdrop-blur-md flex items-center gap-2.5 px-2.5 pointer-events-auto",
        "transition-[box-shadow,border-color,opacity] duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:border-primary/30",
        draggable ? (dragPreview ? "cursor-grabbing" : "cursor-grab") : "cursor-pointer",
        isGhost || isPending ? "border-dashed border-border/70" : "border-white/30",
        isDuplicate && "border-dashed border-border/50 opacity-70",
        isSelected && "ring-2 ring-primary/70 border-primary/30",
        isOnPath && !isSelected && "ring-2 ring-amber-500/70 border-amber-500/40",
        isRoot && !dragPreview && "scale-[1.04]",
        isPending && "opacity-60",
        dragPreview && "z-20 shadow-xl",
      )}
      style={{
        left:        x,
        top:         y,
        width:       NODE_W,
        height:      NODE_H,
        transform:   dragPreview ? `translate(${dragPreview.dx}px, ${dragPreview.dy}px)` : undefined,
        touchAction: draggable ? "none" : undefined,
        boxShadow: isGhost || isPending
          ? undefined
          : "0 4px 14px -6px hsl(230 40% 12% / 0.25), inset 0 1px 0 hsl(0 0% 100% / 0.4)",
      }}
    >
      <div className={cn("h-9 w-9 rounded-full overflow-hidden shrink-0 bg-muted flex items-center justify-center ring-2", ringColor)}>
        {person.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.avatarUrl}
            alt={displayName}
            className={cn("h-full w-full object-cover", isMemorial && "saturate-50")}
          />
        ) : (
          <span className="text-[10px] font-semibold text-muted-foreground">
            {initials || <User className="h-3.5 w-3.5" />}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className={cn("text-[11.5px] font-semibold leading-tight truncate", (isGhost || isPending) && "italic text-muted-foreground")}>
          {displayName}
        </p>
        {person.nickname && (
          <p className="text-[10px] italic text-muted-foreground/80 leading-tight truncate">
            &ldquo;{person.nickname}&rdquo;
          </p>
        )}
        {yearLabel && (
          <p className="text-[10px] text-muted-foreground/80 mt-0.5 tabular-nums leading-tight">
            {yearLabel}
          </p>
        )}
      </div>

      {comparePickIndex && (
        <span className="absolute -top-1.5 -left-1.5 z-10 h-4 w-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
          {comparePickIndex}
        </span>
      )}

      {hasCollapsible && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleCollapse?.() }}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            "absolute left-1/2 -translate-x-1/2 h-4 w-4 rounded-full border bg-background flex items-center justify-center",
            "text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors z-10",
            collapseDirection === "up" ? "-top-2" : "-bottom-2",
          )}
          aria-label={t(isCollapsed ? "node.expand" : "node.collapse")}
          title={t(isCollapsed ? "node.expand" : "node.collapse")}
        >
          {isCollapsed ? <Plus className="h-2.5 w-2.5" /> : <Minus className="h-2.5 w-2.5" />}
        </button>
      )}

      {(isSessionUser || isMemorial || isPending || isDuplicate) && (
        <div className="absolute bottom-1 right-1 flex items-center gap-1">
          {isDuplicate && (
            <span className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full bg-secondary text-foreground/70" title={t("node.duplicateHint")}>
              <GitBranch className="h-2 w-2" />
            </span>
          )}
          {isPending && (
            <span className="text-[8px] font-semibold uppercase tracking-wider px-1 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300" title={t("node.awaitingConfirmation")}>
              {t("node.pending")}
            </span>
          )}
          {isMemorial && (
            <span className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full bg-secondary text-foreground/70" title={t("node.memorial")}>
              <BookOpen className="h-2 w-2" />
            </span>
          )}
          {isSessionUser && (
            <span className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded-full bg-primary text-primary-foreground">
              {t("node.you")}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
