import { notFound } from "next/navigation"
import Link from "next/link"
import { getTranslations, getLocale } from "next-intl/server"
import { MapPin, Pencil, CalendarDays, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { ImageCarousel } from "@/components/image-carousel"
import { PlaceQrButton } from "@/components/place-qr-button"
import { SignupPrompt } from "@/components/auth/signup-prompt"
import { auth } from "@/auth"
import { getPlaceById } from "@/queries/places"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { assertPublicMemorialAccess } from "@/lib/public-profile-access"
import { formatDateRange } from "@/lib/format-date"

interface Props {
  params: Promise<{ id: string; placeId: string }>
}

export default async function PlaceDetailPage({ params }: Props) {
  const { id, placeId } = await params
  const session = await auth()
  const viewerId = session?.user?.id
  const isAnon = !viewerId
  const locale = await getLocale()
  const t = await getTranslations("Places")

  const profile = await getProfileById(id)
  assertPublicMemorialAccess(profile, viewerId, id)

  const isOwn = viewerId ? canManageProfile(profile, viewerId) : false
  const place = await getPlaceById(id, placeId)
  if (!place) notFound()

  const addressLine = [place.city, place.state, place.country].filter(Boolean).join(", ")
  const dates = formatDateRange(place.startDate, place.endDate, locale)

  return (
    <div className="relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32">
        <div className="mb-2 animate-fade-in">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
              <BackButton href={`/profile/${id}/places`} label={t("backToPlaces")} />
              <h1 className="text-4xl font-semibold tracking-tight whitespace-nowrap">{place.title}</h1>
            </div>
            {isOwn && (
              <Button asChild variant="outline" size="sm" className="shrink-0 gap-1.5">
                <Link href={`/profile/${id}/places/${placeId}/edit`}>
                  <Pencil className="h-4 w-4" />{t("editTitle")}
                </Link>
              </Button>
            )}
          </div>
          {place.categories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {place.categories.map((c) => (
                <Badge key={c} variant="secondary">{t(`cat_${c}`)}</Badge>
              ))}
            </div>
          )}
        </div>

        {place.photos.length > 0 && (
          <section className="mt-8 animate-fade-in" style={{ animationDelay: "80ms" }}>
            <ImageCarousel
              images={place.photos.map((url, i) => ({ id: `${i}`, url }))}
              altText={(i) => t("photoAlt", { number: i + 1 })}
              prevLabel={t("carouselPrevious")}
              nextLabel={t("carouselNext")}
            />
          </section>
        )}

        {place.description && (
          <section
            className="mt-8 glass-card no-sheen px-6 py-8 md:px-10 animate-fade-in"
            style={{ animationDelay: "160ms" }}
          >
            <p className="text-base leading-relaxed whitespace-pre-wrap">{place.description}</p>
          </section>
        )}

        <section
          className="mt-8 glass-card no-sheen px-6 py-6 flex flex-col gap-3 text-sm text-muted-foreground animate-fade-in"
          style={{ animationDelay: "240ms" }}
        >
          {addressLine && (
            <p className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0" />{addressLine}</p>
          )}
          {dates && (
            <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 shrink-0" />{dates}</p>
          )}
          {(place.lat !== 0 || place.lon !== 0) && (
            <a
              href={`https://www.google.com/maps?q=${place.lat},${place.lon}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline w-fit"
            >
              <ExternalLink className="h-4 w-4" />{t("openInGoogleMaps")}
            </a>
          )}
          <div className="pt-3 border-t border-border/60">
            <PlaceQrButton profileId={id} placeId={placeId} />
          </div>
        </section>
      </main>

      {isAnon && <SignupPrompt />}
    </div>
  )
}
