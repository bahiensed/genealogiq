import { getTranslations } from "next-intl/server"
import { auth } from "@/auth"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { PlacesMapLoader } from "@/components/places-map-loader"
import { getPlacesForMap } from "@/queries/places"
import { getProfileById } from "@/queries/profile"
import { assertPublicMemorialAccess } from "@/lib/public-profile-access"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProfilePlacesMapPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  const viewerId = session?.user?.id
  const t = await getTranslations("Places")

  const profile = await getProfileById(id)
  assertPublicMemorialAccess(profile, viewerId, id)

  const pins = await getPlacesForMap(id)

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-16">
        <div className="flex items-center gap-3 md:gap-4 mb-6 animate-fade-in">
          <BackButton href={`/profile/${id}/places`} label={t("backToPlaces")} />
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight whitespace-nowrap">{t("mapTitle")}</h1>
        </div>

        <div className="glass-card no-sheen p-2 overflow-hidden animate-fade-in">
          <div className="h-[70vh] w-full overflow-hidden rounded-2xl">
            <PlacesMapLoader pins={pins} />
          </div>
        </div>
      </main>
    </div>
  )
}
