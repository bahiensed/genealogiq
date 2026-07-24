import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { assertPublicMemorialAccess } from "@/lib/public-profile-access"
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
  const session = await auth()
  const viewerId = session?.user?.id

  const profile = await getProfileById(id)
  assertPublicMemorialAccess(profile, viewerId, id)

  const canManage = viewerId ? canManageProfile(profile, viewerId) : false

  const [{ persons, relations }, features] = await Promise.all([
    getFamilyTree(id, { id: viewerId ?? null, canManage }),
    getMemorialFeatures(id),
  ])
  // Anonymous visitors view the tree read-only, so no guardian lookup is needed.
  const guardianRows = viewerId
    ? await prisma.appUserGuardian.findMany({
        where:  { guardianId: viewerId },
        select: { appUserId: true, status: true },
      })
    : []

  // Sets of person ids the session user can edit (ACCEPTED guardian or self)
  // and those with a pending co-management request from the session user.
  const managedIds   = new Set<string>(viewerId ? [viewerId] : [])
  const requestedIds = new Set<string>()
  for (const g of guardianRows) {
    if (g.status === "ACCEPTED") managedIds.add(g.appUserId)
    else if (g.status === "PENDING") requestedIds.add(g.appUserId)
  }

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
    <div className="fixed top-16 inset-x-0 bottom-0 flex flex-col">
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
          sessionUserId={viewerId ?? ""}
          canManage={canManage}
          managedIds={Array.from(managedIds)}
          requestedIds={Array.from(requestedIds)}
        />
      </div>
    </div>
  )
}
