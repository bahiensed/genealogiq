import { getTranslations } from "next-intl/server"
import { auth } from "@/auth"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { PlacesMapLoader } from "@/components/places-map-loader"
import { SignupPrompt } from "@/components/auth/signup-prompt"
import { getPlacesForMap, ANON_PLACES_LIMIT } from "@/queries/places"
import { getProfileById } from "@/queries/profile"
import { assertPublicMemorialAccess } from "@/lib/public-profile-access"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProfilePlacesMapPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  const viewerId = session?.user?.id
  const isAnon = !viewerId
  const t = await getTranslations("Places")

  const profile = await getProfileById(id)
  assertPublicMemorialAccess(profile, viewerId, id)

  // Same bound as the list page's hard wall — without this, the list page's
  // "View map" button would be a trivial bypass (anon sees every pin here
  // even when blocked from place #13+ on the list).
  const pins = await getPlacesForMap(id, isAnon ? ANON_PLACES_LIMIT : undefined)

  return (
    // Full-screen fixed canvas, same shape as the family tree page: its own
    // pan/zoom surface, not a scrolling page with the map boxed in a card.
    // FooterVisibility hides the site footer on this route for the same
    // reason it hides it on /tree — a scrolling footer below a fixed-position
    // canvas would sit unreachable, and clutters what's meant to read as an
    // immersive view.
    <div className="fixed top-16 inset-x-0 bottom-0 flex flex-col">
      <AuroraBackdrop />

      <div className="relative z-10 border-b border-border/60 bg-background/60 backdrop-blur-md shrink-0">
        <div className="container pt-8 pb-8">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <BackButton href={`/profile/${id}/places`} label={t("backToPlaces")} />
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight whitespace-nowrap">{t("mapTitle")}</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <PlacesMapLoader pins={pins} />
      </div>

      {isAnon && <SignupPrompt />}
    </div>
  )
}
