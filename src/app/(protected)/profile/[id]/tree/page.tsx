import { notFound } from "next/navigation"
import { verifySession } from "@/lib/dal"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { getFamilyTree } from "@/queries/family-tree"
import { getMemorialFeatures } from "@/lib/subscription"
import { computeLayout } from "@/components/family-tree/canvas/layout"
import { FamilyTreeCanvas } from "@/components/family-tree/canvas/family-tree-canvas"
import { TreeHeader } from "@/components/family-tree/header/tree-header"
import { AuroraBackdrop } from "@/components/aurora-backdrop"

interface Props {
  params: Promise<{ id: string }>
}

export default async function TreePage({ params }: Props) {
  const { id } = await params
  const session = await verifySession()

  const profile = await getProfileById(id)
  if (!profile) notFound()

  const canManage = canManageProfile(profile, session.user.id)

  const [{ persons, relations }, features] = await Promise.all([
    getFamilyTree(id),
    getMemorialFeatures(id),
  ])

  // Layout once on the server purely to extract generation count for the header
  // (the client recomputes its own positions; this is just metadata).
  const { generation } = computeLayout(persons, relations, id)

  const memberCount = Object.keys(persons).length
  const memberLimit = features.treeMaxMembers
  const atLimit = memberCount >= memberLimit

  // Existing parents of the root, so the header dialog can offer the
  // "Married to X" checkbox when adding a 2nd parent.
  const rootParents = relations
    .filter((r) => r.type === "PARENT_OF" && r.toId === id)
    .map((r) => {
      const p = persons[r.fromId]
      return p ? { id: p.id, name: `${p.firstName} ${p.lastName}` } : null
    })
    .filter((p): p is { id: string; name: string } => p !== null)

  return (
    <div className="relative flex flex-col mt-16" style={{ height: "calc(100vh - 64px)" }}>
      <AuroraBackdrop />

      <TreeHeader
        rootFirstName={profile.firstName}
        rootId={id}
        persons={persons}
        generations={generation}
        memberLimit={memberLimit}
        currentTier={features.code}
        canManage={canManage}
        atLimit={atLimit}
        rootParents={rootParents}
      />

      <div className="flex-1 relative">
        <FamilyTreeCanvas
          persons={persons}
          relations={relations}
          rootId={id}
          sessionUserId={session.user.id}
          canManage={canManage}
        />
      </div>
    </div>
  )
}
