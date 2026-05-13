import { notFound, redirect } from "next/navigation"
import { verifySession } from "@/lib/dal"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { TributeModeration } from "@/components/tribute-moderation"
import { getPendingTributesByProfileId } from "@/queries/tribute"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"

interface Props {
  params: Promise<{ id: string }>
}

export default async function TributeModeratePage({ params }: Props) {
  const { id } = await params
  const session = await verifySession()

  const [profile, pending] = await Promise.all([
    getProfileById(id),
    getPendingTributesByProfileId(id),
  ])
  if (!profile) notFound()

  if (!canManageProfile(profile, session.user.id)) redirect(`/profile/${id}/tributes`)

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32 max-w-4xl">
        <div className="mb-8 animate-fade-in bg-transparent">
          <div className="flex items-center gap-3 md:gap-4">
            <BackButton href={`/profile/${id}/tributes`} label="Back to tributes" />
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight whitespace-nowrap">Moderate Tributes</h1>
          </div>
          <p className="text-muted-foreground mt-2 bg-transparent">
            {pending.length} pending {pending.length === 1 ? "tribute" : "tributes"} awaiting review.
          </p>
        </div>

        <TributeModeration items={pending} profileId={id} />
      </main>
    </div>
  )
}
