import { notFound } from "next/navigation"
import Link from "next/link"
import { getLocale, getTranslations } from "next-intl/server"
import { getCountryName } from "@genealogiq/core"
import { MapPin, Plus, SquarePen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuroraBackdrop } from "@/components/aurora-backdrop"
import { BackButton } from "@/components/back-button"
import { verifySession } from "@/lib/dal"
import { getProfileById } from "@/queries/profile"
import { getGeolocationForViewer } from "@/queries/geolocation"
import { canManageProfile } from "@/lib/profile"

interface Props {
  params: Promise<{ id: string }>
}

export default async function GeolocationPage({ params }: Props) {
  const { id } = await params
  const session = await verifySession()

  const [profile, geo] = await Promise.all([
    getProfileById(id),
    getGeolocationForViewer(id),
  ])
  if (!profile) notFound()

  const isOwn = canManageProfile(profile, session.user.id)
  const isEmpty = !geo
  const editHref = `/profile/${id}/geolocation/edit`
  const locale = await getLocale()
  const t = await getTranslations("Geolocation")
  const tc = await getTranslations("Common")

  const photos = geo
    ? [geo.photo1, geo.photo2, geo.photo3].filter((p): p is string => !!p)
    : []

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBackdrop variant="page" intensity="bold" />

      <main className="container relative pt-24 pb-32 max-w-6xl">
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
              <BackButton href={`/profile/${id}`} label={t("backToProfile")} />
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight whitespace-nowrap">{t("title")}</h1>
            </div>
            {isOwn && (
              <Button asChild className="shrink-0 gap-2">
                <Link href={editHref}>
                  {isEmpty ? <Plus className="h-4 w-4" /> : <SquarePen className="h-4 w-4" />}
                  {isEmpty ? t("addLocation") : tc("edit")}
                </Link>
              </Button>
            )}
          </div>
          <p className="text-muted-foreground mt-2 italic">
            {t("tagline")}
          </p>
        </div>

        {isEmpty ? (
          <div className="glass-card flex flex-col items-center justify-center gap-3 py-20 text-center animate-fade-in">
            <MapPin className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">{t("emptyState")}</p>
            {isOwn && (
              <Button asChild className="gap-2">
                <Link href={editHref}><Plus className="h-4 w-4" />{t("addLocation")}</Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            {photos.length > 0 && (
              <section className="mb-10 animate-fade-in" style={{ animationDelay: "80ms" }}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {photos.map((src, i) => (
                    <div key={i} className="glass-card no-sheen p-2">
                      <div className="aspect-square overflow-hidden rounded-2xl bg-muted/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt={t("viewPhotoAlt", { place: geo.placeName, number: i + 1 })}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section
              className="glass-card no-sheen px-6 py-8 md:px-10 md:py-10 mb-6 animate-fade-in"
              style={{ animationDelay: "160ms" }}
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 space-y-3">
                  <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">{geo.placeName}</h2>
                  <div className="text-base text-foreground/80 space-y-1">
                    {geo.address && <div>{geo.address}</div>}
                    <div>{[geo.city, geo.state, getCountryName(geo.country, locale)].filter(Boolean).join(", ")}</div>
                    {geo.section && (
                      <div className="text-sm text-muted-foreground pt-1">{geo.section}</div>
                    )}
                  </div>
                  {(geo.lat !== 0 || geo.lon !== 0) && (
                    <div className="pt-3 border-t border-border/60">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t("coordinates")}</div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <code className="text-sm font-mono">
                          {geo.lat.toFixed(6)}, {geo.lon.toFixed(6)}
                        </code>
                        <a
                          href={`https://www.google.com/maps?q=${geo.lat},${geo.lon}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          <MapPin className="h-3 w-3" />
                          {t("openInGoogleMaps")}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {geo.notes && (
              <section
                className="glass-card no-sheen px-6 py-6 md:px-10 md:py-8 animate-fade-in"
                style={{ animationDelay: "240ms" }}
              >
                <p className="text-base md:text-lg leading-relaxed text-foreground/90 whitespace-pre-wrap">
                  {geo.notes}
                </p>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
