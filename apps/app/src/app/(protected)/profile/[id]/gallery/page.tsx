import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { verifySession } from "@/lib/dal"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { GalleryClient } from "@/components/gallery-client"
import { getGalleryByUserId } from "@/queries/gallery"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { getMemorialFeatures } from "@/lib/subscription"
import { UpgradeHint } from "@/components/upgrade-hint"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProfileGalleryPage({ params }: Props) {
  const { id } = await params
  const session = await verifySession()
  const t = await getTranslations("Gallery")
  const [profile, items, features] = await Promise.all([
    getProfileById(id),
    getGalleryByUserId(id),
    getMemorialFeatures(id),
  ])

  if (!profile) notFound()

  const isOwn = canManageProfile(profile, session.user.id)
  const name = `${profile.firstName} ${profile.lastName}`

  const imageCount = items.filter((i) => i.kind === "image").length
  const videoCount = items.filter((i) => i.kind === "video").length
  const atLimit = imageCount >= features.galleryMaxImages || videoCount >= features.galleryMaxVideos

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32 max-w-6xl">
        <div className="flex items-center justify-between gap-3 mb-2 animate-fade-in">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <BackButton href={`/profile/${id}`} label={t("backToProfile")} />
            <div className="min-w-0">
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight whitespace-nowrap">{t("title")}</h1>
              {!isOwn && <p className="text-muted-foreground text-sm mt-1 truncate bg-transparent">{name}</p>}
            </div>
          </div>
          {(imageCount > 0 || videoCount > 0) && (
            <div className="flex items-center gap-2 shrink-0">
              {imageCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-0.5">
                  {t("imageCount", { count: imageCount })}
                </span>
              )}
              {videoCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-0.5">
                  {t("videoCount", { count: videoCount })}
                </span>
              )}
            </div>
          )}
        </div>

        <GalleryClient
          items={items}
          editHref={`/profile/${id}/gallery/edit`}
          isOwn={isOwn}
          upgradeHint={isOwn && atLimit
            ? <UpgradeHint context="gallery" currentTier={features.code} />
            : null}
        />
      </main>
    </div>
  )
}
