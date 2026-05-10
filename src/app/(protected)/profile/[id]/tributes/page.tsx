import { notFound } from "next/navigation"
import { verifySession } from "@/lib/dal"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { TributesClient } from "@/components/tributes-client"
import { getApprovedTributesByProfileId, getMyTributeForProfile } from "@/queries/tribute"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"

interface Props {
  params: Promise<{ id: string }>
}

export default async function TributesPage({ params }: Props) {
  const { id } = await params
  const session = await verifySession()
  const profile = await getProfileById(id)
  if (!profile) notFound()

  const isExactOwn = id === session.user.id
  const canWrite = !isExactOwn

  const [tributes, myTribute] = await Promise.all([
    getApprovedTributesByProfileId(id),
    getMyTributeForProfile(session.user.id, id),
  ])
  const hasPendingFromMe = myTribute?.status === "PENDING"

  const name = `${profile.firstName} ${profile.lastName}`
  const isManager = canManageProfile(profile, session.user.id)

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2 animate-fade-in">
          <div className="flex items-center gap-3 md:gap-4">
            <BackButton href={`/profile/${id}`} label="Back to profile" />
            <div>
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Tributes</h1>
              {!isManager && <p className="text-muted-foreground text-sm mt-1">{name}</p>}
            </div>
          </div>
          {tributes.length > 0 && (
            <span className="shrink-0 self-end inline-flex items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-0.5">
              {tributes.length} {tributes.length === 1 ? "tribute" : "tributes"}
            </span>
          )}
        </div>

        <TributesClient
          items={tributes}
          profileId={id}
          sessionUserId={session.user.id}
          canWrite={canWrite}
          hasPendingFromMe={hasPendingFromMe}
        />
      </main>
    </div>
  )
}
