import { getTranslations } from "next-intl/server"
import { auth } from "@/auth"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { GalleryClient } from "@/components/gallery-client"
import { SignupPrompt } from "@/components/auth/signup-prompt"
import { getGalleryByUserId, getGalleryCounts } from "@/queries/gallery"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { assertPublicMemorialAccess } from "@/lib/public-profile-access"
import { getMemorialFeatures } from "@/lib/subscription"
import { UpgradeHint } from "@/components/upgrade-hint"

// Anonymous visitors preview a generous set of media; a scroll-triggered sign-up
// dialog nudges them to join for the rest.
const ANON_GALLERY_LIMIT = 16

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProfileGalleryPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  const viewerId = session?.user?.id
  const isAnon = !viewerId
  const t = await getTranslations("Gallery")

  const profile = await getProfileById(id)
  assertPublicMemorialAccess(profile, viewerId, id)

  const isOwn = viewerId ? canManageProfile(profile, viewerId) : false
  const features = isOwn ? await getMemorialFeatures(id) : null
  const name = `${profile.firstName} ${profile.lastName}`

  // Anonymous: a bounded slice of items + cheap total counts for the badges. Authed:
  // the full set (the client paginates it). Never materialize the whole table for anon.
  const items = await getGalleryByUserId(id, isAnon ? ANON_GALLERY_LIMIT : undefined)
  const counts = isAnon ? await getGalleryCounts(id) : null
  const imageCount = counts ? counts.images : items.filter((i) => i.kind === "image").length
  const videoCount = counts ? counts.videos : items.filter((i) => i.kind === "video").length
  const atLimit = !!features && (imageCount >= features.galleryMaxImages || videoCount >= features.galleryMaxVideos)

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
          upgradeHint={isOwn && atLimit && features
            ? <UpgradeHint context="gallery" currentTier={features.code} />
            : null}
        />

      </main>

      {isAnon && <SignupPrompt />}
    </div>
  )
}
