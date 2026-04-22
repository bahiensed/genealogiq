import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { BioEditForm } from "@/components/bio-edit-form"
import { verifySession } from "@/lib/dal"
import { getBioByUserId } from "@/queries/bio"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"

interface Props {
  params: Promise<{ id: string }>
}

export default async function BioEditPage({ params }: Props) {
  const { id } = await params
  const session = await verifySession()

  const [profile, bio] = await Promise.all([getProfileById(id), getBioByUserId(id)])
  if (!profile) notFound()

  if (!canManageProfile(profile, session.user.id)) redirect(`/profile/${id}/bio`)

  const isCreating = !bio

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32 max-w-4xl">
        <section className="mb-8 flex items-end justify-between gap-4 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 md:gap-4">
              <BackButton href={`/profile/${id}/bio`} label="Back to biography" />
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
                {isCreating ? "Write Biography" : "Edit Biography"}
              </h1>
            </div>
            <p className="text-muted-foreground mt-2">
              {isCreating ? "Add photos, a quote and the life story." : "Update photos, quote and life story."}
            </p>
          </div>
          <Button variant="ghost" asChild className="shrink-0">
            <Link href={`/profile/${id}/bio`}>Cancel</Link>
          </Button>
        </section>

        <BioEditForm initial={bio} profileId={id} />
      </main>
    </div>
  )
}
