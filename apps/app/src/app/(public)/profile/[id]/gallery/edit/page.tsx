import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
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
  const [t, tc] = await Promise.all([
    getTranslations("Gallery"),
    getTranslations("Common"),
  ])

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

      <main className="container relative pt-24 pb-32">
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 md:gap-4">
            <BackButton href={`/profile/${id}/gallery`} label={t("backToGallery")} />
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight whitespace-nowrap">{t("editTitle")}</h1>
          </div>
          <div className="mt-2 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 bg-transparent">
            <div className="flex flex-col gap-1 min-w-0 bg-transparent">
              <p className="text-muted-foreground italic bg-transparent">{t("editSubtitle")}</p>
              {atLimit && <UpgradeHint context="gallery" currentTier={features.code} />}
            </div>
            <Button variant="ghost" asChild className="shrink-0 self-end lg:self-auto">
              <Link href={`/profile/${id}/gallery`}>{tc("cancel")}</Link>
            </Button>
          </div>
        </div>

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
