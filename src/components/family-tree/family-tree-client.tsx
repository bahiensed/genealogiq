'use client'

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useReactFlow,
  useKeyPress,
  type Node as RFNode,
  type Edge,
  type NodeMouseHandler,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import calcTree from "relatives-tree"
import type { Node as RTNode, ExtNode } from "relatives-tree/lib/types"
import { PersonNode, type PersonNodeData } from "@/components/family-tree/person-node"
import { SpouseEdge } from "@/components/family-tree/spouse-edge"
import { FamilyLinkEdge } from "@/components/family-tree/family-link-edge"
import { PersonInfoSheet } from "@/components/family-tree/person-info-sheet"
import type { TreePerson } from "@/queries/family-tree"

const NODE_W = 160
const NODE_H = 80
const X_GAP  = 40
const Y_GAP  = 80
const TRUNK_CHILD_CLEARANCE = 32
const UNIT_X = (NODE_W + X_GAP) / 2
const UNIT_Y = (NODE_H + Y_GAP) / 2

const nodeTypes = { person: PersonNode }
const edgeTypes = { spouse: SpouseEdge, familyLink: FamilyLinkEdge }

export type RelatedRelation = { type: string; fromId: string; toId: string }

interface Props {
  rtNodes: RTNode[]
  persons: Record<string, TreePerson>
  rootId: string
  sessionUserId: string
  canManage: boolean
  relations: RelatedRelation[]
}

function FamilyTreeInner({ rtNodes, persons, rootId, sessionUserId, canManage, relations }: Props) {
  const { fitView } = useReactFlow()
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const fPressed = useKeyPress("f")
  useEffect(() => {
    if (fPressed) fitView({ padding: 0.3, duration: 400 })
  }, [fPressed, fitView])

  const { rfNodes, rfEdges } = useMemo(() => {
    if (rtNodes.length === 0) return { rfNodes: [], rfEdges: [] }

    const { nodes: extNodes } = calcTree(rtNodes, { rootId, placeholders: false })

    const rfNodesOut: RFNode<PersonNodeData>[] = extNodes.map((n: ExtNode) => ({
      id: n.id,
      type: "person",
      position: { x: n.left * UNIT_X, y: n.top * UNIT_Y },
      data: { person: persons[n.id]!, isRoot: n.id === rootId, isSessionUser: n.id === sessionUserId },
      draggable: false,
      selectable: true,
    }))

    // Map of node top-left positions for edge geometry
    const posById = new Map<string, { x: number; y: number }>()
    extNodes.forEach((n: ExtNode) => posById.set(n.id, { x: n.left * UNIT_X, y: n.top * UNIT_Y }))

    const rfEdgesOut: Edge[] = []
    const seenSpouse  = new Set<string>()
    const seenChild   = new Set<string>()
    const seenSibling = new Set<string>()

    // Pre-compute trunk extents per parent-pair so all siblings share the same horizontal trunk.
    const trunkByPair = new Map<string, { leftX: number; rightX: number }>()
    for (const node of rtNodes) {
      for (const child of node.children) {
        const childNode = rtNodes.find((n) => n.id === child.id)
        if (!childNode || childNode.parents.length < 2) continue
        const [pA, pB] = childNode.parents.slice(0, 2).map((p) => p.id)
        const key = [pA, pB].sort().join("-")
        const childPos = posById.get(child.id)
        if (!childPos) continue
        const centerX = childPos.x + NODE_W / 2
        const cur = trunkByPair.get(key)
        trunkByPair.set(key, cur
          ? { leftX: Math.min(cur.leftX, centerX), rightX: Math.max(cur.rightX, centerX) }
          : { leftX: centerX, rightX: centerX }
        )
      }
    }

    for (const node of rtNodes) {
      // ── Children edges
      for (const child of node.children) {
        const childNode = rtNodes.find((n) => n.id === child.id)
        if (!childNode) continue
        const childParents = childNode.parents.map((p) => p.id)

        if (childParents.length >= 2) {
          // Family link (T-junction) — one edge per child, deduped
          if (seenChild.has(child.id)) continue
          seenChild.add(child.id)

          const [pA, pB] = childParents.slice(0, 2)
          const posA = posById.get(pA)
          const posB = posById.get(pB)
          if (!posA || !posB) continue

          const otherCenterX = posB.x + NODE_W / 2
          const trunk = trunkByPair.get([pA, pB].sort().join("-"))

          rfEdgesOut.push({
            id: `fl-${[pA, pB].sort().join("-")}-${child.id}`,
            source: pA,
            target: child.id,
            type: "familyLink",
            data: {
              otherParentX:   otherCenterX,
              startYOverride: posA.y + NODE_H / 2,
              trunkY:         posA.y + NODE_H + Y_GAP - TRUNK_CHILD_CLEARANCE,
              trunkLeftX:     trunk?.leftX,
              trunkRightX:    trunk?.rightX,
              active: true,
            },
          } as Edge)
        } else {
          // Single parent — simple smoothstep
          rfEdgesOut.push({
            id: `pc-${node.id}-${child.id}`,
            source: node.id,
            target: child.id,
            type: "smoothstep",
            style: { stroke: "url(#ft-edge-parent)", strokeWidth: 1.75 },
          })
        }
      }

      // ── Spouse edges
      for (const spouse of node.spouses) {
        const key = [node.id, spouse.id].sort().join("|")
        if (seenSpouse.has(key)) continue
        seenSpouse.add(key)
        rfEdgesOut.push({
          id: `sp-${key}`,
          source: node.id,
          target: spouse.id,
          sourceHandle: "right",
          targetHandle: "left",
          type: "spouse",
          style: { stroke: "hsl(var(--brand-indigo) / 0.5)", strokeWidth: 1.5 },
        })
      }

      // ── Sibling edges
      for (const sibling of node.siblings) {
        const key = [node.id, sibling.id].sort().join("|")
        if (seenSibling.has(key)) continue
        seenSibling.add(key)
        rfEdgesOut.push({
          id: `sib-${key}`,
          source: node.id,
          target: sibling.id,
          sourceHandle: "right",
          targetHandle: "left",
          type: "smoothstep",
          style: { stroke: "hsl(var(--muted-foreground) / 0.35)", strokeWidth: 1, strokeDasharray: "3 3" },
        })
      }
    }

    return { rfNodes: rfNodesOut, rfEdges: rfEdgesOut }
  }, [rtNodes, persons, rootId, sessionUserId])

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    setSelectedId(node.id)
    setSheetOpen(true)
  }, [])

  const relatedRelations = useMemo<RelatedRelation[]>(() => {
    if (!selectedId) return []
    return relations.filter((r) =>
      (r.fromId === rootId && r.toId === selectedId) ||
      (r.fromId === selectedId && r.toId === rootId)
    )
  }, [selectedId, rootId, relations])

  const selectedPerson = selectedId ? (persons[selectedId] ?? null) : null

  return (
    <div className="h-full w-full relative">
      {/* SVG gradient defs for parent-child edges */}
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <linearGradient id="ft-edge-parent" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="hsl(var(--brand-indigo))" stopOpacity="0.85" />
            <stop offset="100%" stopColor="hsl(280 60% 65%)"         stopOpacity="0.7" />
          </linearGradient>
        </defs>
      </svg>

      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={() => setSheetOpen(false)}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="hsl(var(--muted-foreground) / 0.15)" gap={24} />
        <Controls showInteractive={false} position="bottom-left" />
      </ReactFlow>

      <PersonInfoSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        person={selectedPerson}
        relatedRelations={relatedRelations}
        rootId={rootId}
        canManage={canManage}
        onSuccess={router.refresh}
      />
    </div>
  )
}

export function FamilyTreeClient(props: Props) {
  return (
    <ReactFlowProvider>
      <FamilyTreeInner {...props} />
    </ReactFlowProvider>
  )
}
