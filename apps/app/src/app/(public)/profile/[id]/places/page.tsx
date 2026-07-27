import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import Link from "next/link"
import { Map, MapPinPlus, MapPinPen } from "lucide-react"
import { auth } from "@/auth"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { Button } from "@/components/ui/button"
import { PlacesClient } from "@/components/places-client"
import { SignupPrompt } from "@/components/auth/signup-prompt"
import { getPlacesByUserId, ANON_PLACES_LIMIT } from "@/queries/places"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { getMemorialFeatures } from "@/lib/subscription"
import { assertPublicMemorialAccess } from "@/lib/public-profile-access"
import { QuotaGatedLink } from "@/components/quota-gated-link"

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ place?: string }>
}

export default async function ProfilePlacesPage({ params, searchParams }: Props) {
  const { id } = await params
  const { place } = await searchParams
  // Compatibility with QR codes/links generated before place detail moved to
  // its own route — they still carry ?place=<id>, so send them straight there.
  if (place) redirect(`/profile/${id}/places/${place}`)
  const session = await auth()
  const viewerId = session?.user?.id
  const isAnon = !viewerId
  const t = await getTranslations("Places")

  const profile = await getProfileById(id)
  assertPublicMemorialAccess(profile, viewerId, id)

  const isOwn = viewerId ? canManageProfile(profile, viewerId) : false
  const [places, features] = await Promise.all([
    getPlacesByUserId(id, isAnon ? ANON_PLACES_LIMIT : undefined),
    getMemorialFeatures(id),
  ])
  const atLimit = places.length >= features.geoPlacesMax

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32">
        <div className="flex items-center justify-between gap-3 mb-2 animate-fade-in">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <BackButton href={`/profile/${id}`} label={t("backToProfile")} />
            <h1 className="text-4xl font-semibold tracking-tight whitespace-nowrap">{t("title", { name: profile.firstName })}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {places.length > 0 && (
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link href={`/profile/${id}/places/map`}>
                  <Map className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("viewMap")}</span>
                </Link>
              </Button>
            )}
            {isOwn && (
              <QuotaGatedLink
                href={`/profile/${id}/places/new`}
                atLimit={atLimit}
                limitContext="geoPlaces"
                limit={features.geoPlacesMax}
                tier={features.code}
                size="sm"
                className="gap-1.5"
              >
                {places.length > 0
                  ? <MapPinPen className="h-4 w-4" />
                  : <MapPinPlus className="h-4 w-4" />}
                <span className="hidden sm:inline">{t("addPlace")}</span>
              </QuotaGatedLink>
            )}
          </div>
        </div>
        <p className="text-muted-foreground italic mb-8 animate-fade-in">{t("tagline")}</p>

        <PlacesClient
          places={places}
          profileId={id}
          isOwn={isOwn}
          gated={isAnon}
          atLimit={atLimit}
          geoPlacesMax={features.geoPlacesMax}
          tier={features.code}
        />
      </main>

      {isAnon && <SignupPrompt />}
    </div>
  )
}
