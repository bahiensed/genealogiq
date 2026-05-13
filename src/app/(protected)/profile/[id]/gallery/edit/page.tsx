import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { GalleryEditForm } from "@/components/gallery-edit-form"
import { verifySession } from "@/lib/dal"
import { getGalleryByUserId } from "@/queries/gallery"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { getMemorialFeatures } from "@/lib/subscription"
import { UpgradeHint } from "@/components/upgrade-hint"

interface Props {
  params: Promise<{ id: string }>
}

export default async function GalleryEditPage({ params }: Props) {
  const { id } = await params
  const session = await verifySession()

  const [profile, items, features] = await Promise.all([
    getProfileById(id),
    getGalleryByUserId(id),
    getMemorialFeatures(id),
  ])
  if (!profile) notFound()

  if (!canManageProfile(profile, session.user.id)) redirect(`/profile/${id}/gallery`)

  const imageCount = items.filter((i) => i.kind === "image").length
  const videoCount = items.filter((i) => i.kind === "video").length
  const atLimit = imageCount >= features.galleryMaxImages || videoCount >= features.galleryMaxVideos

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32 max-w-5xl">
        <section className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-in">
          <div className="bg-transparent">
            <div className="flex items-center gap-3 md:gap-4">
              <BackButton href={`/profile/${id}/gallery`} label="Back to gallery" />
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight whitespace-nowrap">Edit Gallery</h1>
            </div>
            <p className="text-muted-foreground mt-2 bg-transparent">Manage images and videos</p>
          </div>
          <Button variant="ghost" asChild className="shrink-0">
            <Link href={`/profile/${id}/gallery`}>Cancel</Link>
          </Button>
        </section>

        {atLimit && (
          <div className="-mt-4 mb-6">
            <UpgradeHint context="gallery" currentTier={features.code} />
          </div>
        )}

        <GalleryEditForm
          initial={items}
          profileId={id}
          maxImages={features.galleryMaxImages}
          maxVideos={features.galleryMaxVideos}
        />
      </main>
    </div>
  )
}
