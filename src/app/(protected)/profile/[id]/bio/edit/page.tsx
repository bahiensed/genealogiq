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
import { getMemorialFeatures } from "@/lib/subscription"
import { UpgradeHint } from "@/components/upgrade-hint"

interface Props {
  params: Promise<{ id: string }>
}

export default async function BioEditPage({ params }: Props) {
  const { id } = await params
  const session = await verifySession()

  const [profile, bio, features] = await Promise.all([
    getProfileById(id),
    getBioByUserId(id),
    getMemorialFeatures(id),
  ])
  if (!profile) notFound()

  if (!canManageProfile(profile, session.user.id)) redirect(`/profile/${id}/bio`)

  const isCreating = !bio
  const textLen = bio?.text?.length ?? 0
  const imageCount = bio?.images.length ?? 0
  const atLimit = textLen >= features.bioMaxChars || imageCount >= features.bioMaxImages

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32 max-w-4xl">
        <section className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 md:gap-4">
              <BackButton href={`/profile/${id}/bio`} label="Back to biography" />
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
                {isCreating ? "Write Biography" : "Edit Biography"}
              </h1>
            </div>
            <p className="text-muted-foreground mt-2">
              {isCreating ? "Add photos, a quote and the life story" : "Update photos, quote and life story"}
            </p>
          </div>
          <Button variant="ghost" asChild className="shrink-0">
            <Link href={`/profile/${id}/bio`}>Cancel</Link>
          </Button>
        </section>

        {atLimit && (
          <div className="-mt-4 mb-6">
            <UpgradeHint context="bio" currentTier={features.code} />
          </div>
        )}

        <BioEditForm
          initial={bio}
          profileId={id}
          maxChars={features.bioMaxChars}
          maxImages={features.bioMaxImages}
        />
      </main>
    </div>
  )
}
