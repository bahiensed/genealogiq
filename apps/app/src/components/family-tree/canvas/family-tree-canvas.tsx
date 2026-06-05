'use client'

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { SvgCanvas } from "./svg-canvas"
import { ViewportControls } from "./viewport-controls"
import { PersonNode } from "./person-node"
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
  managedIds:     string[]
  requestedIds:   string[]
}

export function FamilyTreeCanvas({ persons, relations, rootId, sessionUserId, canManage, managedIds, requestedIds }: Props) {
  const router = useRouter()
  const layout = useMemo(() => computeLayout(persons, relations, rootId), [persons, relations, rootId])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sheetOpen,  setSheetOpen]  = useState(false)
  const [adder,      setAdder]      = useState<{ anchorId: string; kind: Kind } | null>(null)
  const [editing,    setEditing]    = useState<TreePerson | null>(null)

  const activePerson = selectedId ? persons[selectedId] ?? null : null

  const paddedBounds = useMemo(() => ({
    minX: layout.bounds.minX - 40,
    maxX: layout.bounds.maxX + 40,
    minY: layout.bounds.minY - 40,
    maxY: layout.bounds.maxY + 40,
  }), [layout.bounds])

  const rootCenter = useMemo(() => {
    const r = layout.nodes.find((n) => n.id === rootId)
    if (!r) return null
    return { x: r.x + NODE_W / 2, y: r.y + NODE_H / 2 }
  }, [layout.nodes, rootId])

  const handleNodeActivate = useCallback((id: string) => {
    setSelectedId(id)
    setSheetOpen(true)
  }, [])

  const handleAdd = useCallback((anchorId: string, kind: Kind) => {
    if (!canManage) return
    setAdder({ anchorId, kind })
    setSheetOpen(false)
  }, [canManage])

  // Existing parents of a given anchor, so the dialog can offer
  // "Married to X" when adding a 2nd parent.
  const anchorParentsFor = useCallback((anchorId: string) => {
    return relations
      .filter((r) => r.type === "PARENT_OF" && r.toId === anchorId)
      .map((r) => {
        const p = persons[r.fromId]
        return p ? { id: p.id, name: `${p.firstName} ${p.lastName}` } : null
      })
      .filter((p): p is { id: string; name: string } => p !== null)
  }, [relations, persons])

  const handleEdit = useCallback(() => {
    if (activePerson) setEditing(activePerson)
  }, [activePerson])

  const onSuccess = useCallback(() => {
    setAdder(null)
    setEditing(null)
    router.refresh()
  }, [router])

  const edges = (
    <FamilyEdges
      nodes={layout.nodes}
      parentLines={layout.parentLines}
      coupleLines={layout.coupleLines}
      siblingLines={layout.siblingLines}
    />
  )

  const nodes = layout.nodes.map((n) => {
    const p = persons[n.id]
    if (!p) return null
    return (
      <PersonNode
        key={n.id}
        person={p}
        x={n.x}
        y={n.y}
        isRoot={n.id === rootId}
        isSessionUser={n.id === sessionUserId}
        isSelected={selectedId === n.id}
        onActivate={() => handleNodeActivate(n.id)}
      />
    )
  })

  return (
    <div className="absolute inset-0">
      <SvgCanvas
        bounds={paddedBounds}
        initialTarget={rootCenter}
        edges={edges}
        nodes={nodes}
        overlays={<ViewportControls rootCenter={rootCenter} />}
      />

      {adder && (
        <AddRelativeDialog
          open={true}
          onClose={() => setAdder(null)}
          anchorId={adder.anchorId}
          rootId={rootId}
          initialKind={adder.kind}
          anchorParents={anchorParentsFor(adder.anchorId)}
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
        managedIds={managedIds}
        requestedIds={requestedIds}
        sessionUserId={sessionUserId}
        onEdit={handleEdit}
        onAddRelative={handleAdd}
        onSuccess={onSuccess}
      />
    </div>
  )
}
