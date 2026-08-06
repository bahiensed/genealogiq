import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Button } from "@/components/ui/button"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { PlaceEditForm } from "@/components/place-edit-form"
import { verifySession } from "@/lib/dal"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { getMemorialFeatures } from "@/lib/subscription"
import { getCombinedMediaUsage } from "@/queries/media-usage"
import { getGuardianGeoPlacesStatus } from "@/lib/geo-quota"

interface Props {
  params: Promise<{ id: string }>
}

export default async function NewPlacePage({ params }: Props) {
  const { id } = await params
  const session = await verifySession()
  const [t, tc] = await Promise.all([getTranslations("Places"), getTranslations("Common")])

  const profile = await getProfileById(id)
  if (!profile) notFound()
  if (!canManageProfile(profile, session.user.id)) redirect(`/profile/${id}/places`)

  const [features, geoStatus, combinedMedia] = await Promise.all([
    getMemorialFeatures(id),
    getGuardianGeoPlacesStatus(session.user.id),
    getCombinedMediaUsage(id),
  ])
  if (geoStatus.usage >= geoStatus.limit) redirect(`/profile/${id}/places`)

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32">
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 md:gap-4">
            <BackButton href={`/profile/${id}/places`} label={t("backToPlaces")} />
            <h1 className="text-4xl font-semibold tracking-tight whitespace-nowrap">{t("newTitle")}</h1>
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
          existing={null}
          mediaMax={features.mediaMaxImages}
          otherImagesUsed={combinedMedia.images}
          tier={features.code}
        />
      </main>
    </div>
  )
}
