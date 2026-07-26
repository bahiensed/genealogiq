import { notFound } from "next/navigation"
import Link from "next/link"
import { getTranslations, getLocale } from "next-intl/server"
import { getCountryName } from "@genealogiq/core"
import { Map, MapPin, SquarePen, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { PlacePhotoGrid } from "@/components/place-photo-grid"
import { PlaceQrTrigger } from "@/components/place-qr-trigger"
import { PlaceQrDisplay } from "@/components/place-qr-display"
import { SignupPrompt } from "@/components/auth/signup-prompt"
import { auth } from "@/auth"
import { getPlaceById } from "@/queries/places"
import { getProfileById } from "@/queries/profile"
import { canManageProfile } from "@/lib/profile"
import { assertPublicMemorialAccess } from "@/lib/public-profile-access"
import { formatDateProse } from "@/lib/format-date"

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
  const tc = await getTranslations("Common")

  const profile = await getProfileById(id)
  assertPublicMemorialAccess(profile, viewerId, id)

  const isOwn = viewerId ? canManageProfile(profile, viewerId) : false
  const place = await getPlaceById(id, placeId)
  if (!place) notFound()

  const addressLine = [place.neighborhood, place.city, place.state, getCountryName(place.country, locale)]
    .filter(Boolean)
    .join(", ")
  const hasCoordinates = place.lat !== 0 || place.lon !== 0
  const hasDates = Boolean(place.startDate || place.endDate)
  const coordFormat = new Intl.NumberFormat(locale, { minimumFractionDigits: 4, maximumFractionDigits: 4 })

  return (
    <div className="relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32">
        {/* Header — mirrors tributes/page.tsx exactly: title+back left, a
            right-aligned pill area (there it's a tribute count, here it's the
            category badges), hidden below sm just like the count pill is. The
            title can wrap (no whitespace-nowrap) once space gets tight. */}
        <div className="flex items-center justify-between gap-3 mb-2 animate-fade-in">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <BackButton href={`/profile/${id}/places`} label={t("backToPlaces")} />
            <div className="min-w-0">
              <h1 className="text-4xl font-semibold tracking-tight">{place.title}</h1>
            </div>
          </div>
          {place.categories.length > 0 && (
            <div className="shrink-0 hidden sm:flex flex-wrap justify-end gap-1.5">
              {place.categories.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-0.5"
                >
                  {t(`cat_${c}`)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Subtitle row — clone of tributes-client.tsx's subtitle+actions row.
            The QR trigger only shows up while the code hasn't been generated
            yet; once place.qrGenerated persists, it's gone for good and the
            code itself shows up below instead. Not gated to isOwn (unlike
            Edit) — generating a place's QR has always been open to any
            viewer. */}
        <section className="mb-3 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 animate-fade-in">
          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-muted-foreground italic">{t("detailTitle")}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto">
            {!place.qrGenerated && <PlaceQrTrigger profileId={id} placeId={placeId} />}
            {isOwn && (
              <Button asChild className="gap-2">
                <Link href={`/profile/${id}/places/${placeId}/edit`}>
                  <SquarePen className="h-4 w-4" />
                  <span className="sr-only md:not-sr-only">{tc("edit")}</span>
                </Link>
              </Button>
            )}
          </div>
        </section>

        {/* Content grid: description 3/4-2/3, right rail (QR + location +
            dates, always left-aligned within its own column) 1/4-1/3, single
            column below md with the right rail first. Extra mt- here (vs. the
            mb-2/mb-3 above) is the deliberately larger gap between the
            title/subtitle/actions area and this. */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8 animate-fade-in">
          <div className="order-2 md:order-1 md:col-span-2 lg:col-span-3 min-w-0 pr-4">
            {place.description && (
              <p className="leading-relaxed whitespace-pre-wrap">{place.description}</p>
            )}
          </div>

          <div className="order-1 md:order-2 md:col-span-1 lg:col-span-1 flex flex-col items-start gap-6">
            {place.qrGenerated && <PlaceQrDisplay profileId={id} placeId={placeId} />}

            {hasCoordinates && (
              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span className="tabular-nums">{coordFormat.format(place.lat)} {coordFormat.format(place.lon)}</span>
                </div>
                {addressLine && <p>{addressLine}</p>}
                <div className="flex items-center gap-2 pt-1">
                  <Map className="h-4 w-4 text-primary shrink-0" />
                  <Link href={`/profile/${id}/places/map`} className="text-primary hover:underline">
                    {t("viewMap")}
                  </Link>
                </div>
              </div>
            )}

            {hasDates && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  {place.startDate && <span>{formatDateProse(place.startDate, locale)}</span>}
                  {place.endDate && <span>{formatDateProse(place.endDate, locale)}</span>}
                </div>
              </div>
            )}
          </div>
        </div>

        {place.photos.length > 0 && (
          <div className="mt-12 animate-fade-in" style={{ animationDelay: "80ms" }}>
            <PlacePhotoGrid photos={place.photos} title={place.title} />
          </div>
        )}
      </main>

      {isAnon && <SignupPrompt />}
    </div>
  )
}
