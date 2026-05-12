'use client'

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { SvgCanvas } from "./svg-canvas"
import { ViewportControls } from "./viewport-controls"
import { PersonNode } from "./person-node"
import { QuickAddOverlay } from "./quick-add-overlay"
import { CanvasSearch } from "./canvas-search"
import { FamilyEdges } from "./edges/family-edges"
import { computeLayout, NODE_W, NODE_H } from "./layout"
import { AddRelativeDialog } from "../dialogs/add-relative-dialog"
import { EditMemberDialog } from "../dialogs/edit-member-dialog"
import { PersonInfoSheet } from "../dialogs/person-info-sheet"
import type { TreePerson, TreeRelation } from "@/queries/family-tree"

type Kind = "parent" | "child" | "spouse" | "sibling"

interface Props {
  persons:        Record<string, TreePerson>
  relations:      TreeRelation[]
  rootId:         string
  sessionUserId:  string
  canManage:      boolean
}

export function FamilyTreeCanvas({ persons, relations, rootId, sessionUserId, canManage }: Props) {
  const router = useRouter()
  const layout = useMemo(() => computeLayout(persons, relations, rootId), [persons, relations, rootId])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId,  setHoveredId]  = useState<string | null>(null)
  const [tappedId,   setTappedId]   = useState<string | null>(null)
  const [sheetOpen,  setSheetOpen]  = useState(false)
  const [adder,      setAdder]      = useState<{ anchorId: string; kind: Kind } | null>(null)
  const [editing,    setEditing]    = useState<TreePerson | null>(null)

  const activeOverlayId = hoveredId ?? tappedId
  const activePerson = selectedId ? persons[selectedId] ?? null : null

  // Padding around node bounds so the canvas reserves room for the quick-add buttons.
  const paddedBounds = useMemo(() => ({
    minX: layout.bounds.minX - 40,
    maxX: layout.bounds.maxX + 40,
    minY: layout.bounds.minY - 40,
    maxY: layout.bounds.maxY + 40,
  }), [layout.bounds])

  const handleNodeActivate = useCallback((id: string) => {
    if (selectedId === id && sheetOpen) {
      setSheetOpen(false)
      return
    }
    setSelectedId(id)
    setSheetOpen(true)
    // On mobile, also toggle the quick-add overlay tied to that node
    setTappedId((cur) => (cur === id ? null : id))
  }, [selectedId, sheetOpen])

  const handleAdd = useCallback((anchorId: string, kind: Kind) => {
    if (!canManage) return
    setAdder({ anchorId, kind })
    setTappedId(null)
  }, [canManage])

  const handleEdit = useCallback(() => {
    if (activePerson) setEditing(activePerson)
  }, [activePerson])

  const handleSearchPick = useCallback((id: string) => {
    setSelectedId(id)
    setSheetOpen(true)
  }, [])

  const onSuccess = useCallback(() => {
    setAdder(null)
    setEditing(null)
    router.refresh()
  }, [router])

  return (
    <div className="absolute inset-0">
      <SvgCanvas bounds={paddedBounds}>
        <FamilyEdges
          nodes={layout.nodes}
          parentLines={layout.parentLines}
          coupleLines={layout.coupleLines}
          siblingLines={layout.siblingLines}
        />

        {/* Nodes with hover handlers grouped on a <g> so foreignObject events bubble correctly */}
        {layout.nodes.map((n) => {
          const p = persons[n.id]
          if (!p) return null
          return (
            <g
              key={n.id}
              onMouseEnter={() => setHoveredId(n.id)}
              onMouseLeave={() => setHoveredId((cur) => (cur === n.id ? null : cur))}
            >
              <PersonNode
                person={p}
                x={n.x}
                y={n.y}
                isRoot={n.id === rootId}
                isSessionUser={n.id === sessionUserId}
                isSelected={selectedId === n.id}
                onActivate={() => handleNodeActivate(n.id)}
              />
              {canManage && activeOverlayId === n.id && (
                <QuickAddOverlay
                  x={n.x}
                  y={n.y}
                  onAdd={(kind) => handleAdd(n.id, kind)}
                />
              )}
            </g>
          )
        })}
      </SvgCanvas>

      <ViewportControls />
      <CanvasSearch persons={persons} onPick={handleSearchPick} />

      {adder && (
        <AddRelativeDialog
          open={true}
          onClose={() => setAdder(null)}
          anchorId={adder.anchorId}
          rootId={rootId}
          initialKind={adder.kind}
          onSuccess={onSuccess}
        />
      )}

      {editing && (
        <EditMemberDialog
          open={true}
          onClose={() => setEditing(null)}
          rootId={rootId}
          person={editing}
          onSuccess={onSuccess}
        />
      )}

      <PersonInfoSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        person={activePerson}
        rootId={rootId}
        persons={persons}
        relations={relations}
        canManage={canManage}
        onEdit={handleEdit}
        onSuccess={onSuccess}
      />

      {/* Static reference so NODE constants stay tied to the layout output */}
      <span hidden aria-hidden>{NODE_W}-{NODE_H}</span>
    </div>
  )
}
