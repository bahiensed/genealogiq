import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Button } from "@/components/ui/button"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { PlaceEditForm } from "@/components/place-edit-form"
import { verifySession } from "@/lib/dal"
import { prisma } from "@/lib/prisma"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { getMemorialFeatures } from "@/lib/subscription"
import { getCombinedMediaUsage } from "@/queries/media-usage"

interface Props {
  params: Promise<{ id: string; placeId: string }>
}

export default async function EditPlacePage({ params }: Props) {
  const { id, placeId } = await params
  const session = await verifySession()
  const [t, tc] = await Promise.all([getTranslations("Places"), getTranslations("Common")])

  const [profile, existing, features, combinedMedia] = await Promise.all([
    getProfileById(id),
    prisma.geoPlace.findFirst({ where: { id: placeId, userId: id } }),
    getMemorialFeatures(id),
    getCombinedMediaUsage(id),
  ])
  if (!profile) notFound()
  if (!canManageProfile(profile, session.user.id)) redirect(`/profile/${id}/places`)
  if (!existing) notFound()

  const otherImagesUsed = combinedMedia.images - existing.photos.length

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32">
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 md:gap-4">
            <BackButton href={`/profile/${id}/places`} label={t("backToPlaces")} />
            <h1 className="text-4xl font-semibold tracking-tight whitespace-nowrap">{t("editTitle")}</h1>
          </div>
          <div className="mt-2 flex items-start justify-between gap-3">
            <p className="text-muted-foreground italic">{t("editSubtitle")}</p>
            <Button variant="ghost" asChild className="shrink-0">
              <Link href={`/profile/${id}/places`}>{tc("cancel")}</Link>
            </Button>
          </div>
        </div>

        <PlaceEditForm
          profileId={id}
          existing={existing}
          mediaMax={features.mediaMaxImages}
          otherImagesUsed={otherImagesUsed}
          tier={features.code}
        />
      </main>
    </div>
  )
}
