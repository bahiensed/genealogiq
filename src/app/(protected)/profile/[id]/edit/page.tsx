import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { MemorialEditForm } from "@/components/memorial-edit-form"
import { verifySession } from "@/lib/dal"
import { getProfileById } from "@/queries/profile"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProfileEditPage({ params }: Props) {
  const { id } = await params
  const session = await verifySession()

  const profile = await getProfileById(id)
  if (!profile) notFound()

  const isOwn = id === session.user.id
  const isGuardian = profile.role === "APP_MEMO" && profile.guardedBy.some((g) => g.guardianId === session.user.id)
  if (!isOwn && !isGuardian) redirect(`/profile/${id}`)

  const isMemorialized = profile.role === "APP_MEMO"

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32 max-w-4xl">
        <section className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 md:gap-4">
              <BackButton href={`/profile/${id}`} label="Back to profile" />
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Edit Profile</h1>
            </div>
            <p className="text-muted-foreground mt-2">Edit profile</p>
          </div>
          <Button variant="ghost" asChild className="shrink-0">
            <Link href={`/profile/${id}`}>Cancel</Link>
          </Button>
        </section>

        <MemorialEditForm profileId={id} initial={profile} isMemorialized={isMemorialized} />
      </main>
    </div>
  )
}
