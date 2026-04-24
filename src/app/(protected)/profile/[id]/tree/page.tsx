import { notFound } from "next/navigation"
import { TreePine } from "lucide-react"
import { verifySession } from "@/lib/dal"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { getFamilyTree } from "@/queries/family-tree"
import { prisma } from "@/lib/prisma"
import { FamilyTreeClient } from "@/components/family-tree/family-tree-client"
import { AddFirstRelativeButton } from "@/components/family-tree/add-first-relative-button"
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

  const [{ rtNodes, persons }, relations] = await Promise.all([
    getFamilyTree(id),
    prisma.familyRelation.findMany({
      where: { OR: [{ fromId: id }, { toId: id }] },
      select: { fromId: true, toId: true, type: true },
    }),
  ])

  return (
    <div className="relative flex flex-col mt-16" style={{ height: "calc(100vh - 64px)" }}>
      <AuroraBackdrop />

      {/* Header bar */}
      <div className="relative z-10 flex items-center justify-between px-4 md:px-6 py-3 border-b border-border/60 bg-background/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5">
          <TreePine className="h-5 w-5 text-primary" />
          <div>
            <h1 className="font-semibold text-sm leading-tight">
              {profile.firstName} {profile.lastName}&apos;s Family Tree
            </h1>
            <p className="text-xs text-muted-foreground">
              {rtNodes.length} {rtNodes.length === 1 ? "person" : "people"}
            </p>
          </div>
        </div>
        {canManage && <AddFirstRelativeButton rootId={id} />}
      </div>

      <div className="flex-1 relative">
        <FamilyTreeClient
          rtNodes={rtNodes}
          persons={persons}
          rootId={id}
          sessionUserId={session.user.id}
          canManage={canManage}
          relations={relations}
        />
      </div>
    </div>
  )
}
