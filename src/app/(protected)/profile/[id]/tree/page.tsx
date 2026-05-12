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
import { UpgradeHint } from "@/components/upgrade-hint"

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
  const rootName = `${profile.firstName} ${profile.lastName}`

  return (
    <div className="relative flex flex-col mt-16" style={{ height: "calc(100vh - 64px)" }}>
      <AuroraBackdrop />

      <TreeHeader
        rootName={rootName}
        rootId={id}
        persons={persons}
        generations={generation}
        memberLimit={memberLimit}
        currentTier={features.code}
        canManage={canManage}
        atLimit={atLimit}
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

      {canManage && atLimit && features.code !== "CENTURY" && (
        <div className="relative z-10 px-4 md:px-6 py-3 border-t border-border/60 bg-background/80 backdrop-blur-md">
          <UpgradeHint context="tree" currentTier={features.code} />
        </div>
      )}
    </div>
  )
}
