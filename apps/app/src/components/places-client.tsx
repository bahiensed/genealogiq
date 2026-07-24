"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useTranslations, useLocale } from "next-intl"
import { MapPin, MapPinPlus, ImageIcon, Pencil, CalendarDays, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PlaceQrButton } from "@/components/place-qr-button"
import type { GeoPlaceRow } from "@/queries/places"

function formatRange(
  start: Date | null,
  end: Date | null,
  locale: string,
): string | null {
  const fmt = (d: Date) => d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" })
  if (start && end) return `${fmt(start)} — ${fmt(end)}`
  if (start) return fmt(start)
  if (end) return fmt(end)
  return null
}

function addressLine(p: GeoPlaceRow): string | null {
  const parts = [p.city, p.state, p.country].filter(Boolean)
  return parts.length ? parts.join(", ") : null
}

interface Props {
  places: GeoPlaceRow[]
  profileId: string
  isOwn: boolean
  initialPlaceId?: string | null
}

export function PlacesClient({ places, profileId, isOwn, initialPlaceId }: Props) {
  const t = useTranslations("Places")
  const locale = useLocale()
  const [active, setActive] = useState<GeoPlaceRow | null>(null)

  // Deep-link from a scanned QR (?place=<id>) opens that place's detail.
  useEffect(() => {
    if (!initialPlaceId) return
    const match = places.find((p) => p.id === initialPlaceId)
    if (match) setActive(match)
  }, [initialPlaceId, places])

  if (places.length === 0) {
    return (
      <div className="glass-card flex flex-col items-center justify-center gap-3 py-20 text-center animate-fade-in">
        <MapPin className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">{t("emptyTitle")}</p>
        {isOwn && (
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href={`/profile/${profileId}/places/new`}>
              <MapPinPlus className="h-4 w-4" />{t("addPlace")}
            </Link>
          </Button>
        )}
      </div>
    )
  }

  const dates = (p: GeoPlaceRow) => formatRange(p.startDate, p.endDate, locale)

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {places.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActive(p)}
            className="glass-card group text-left p-0 overflow-hidden flex flex-col animate-fade-in"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="relative aspect-[3/2] w-full overflow-hidden bg-muted">
              {p.photos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.photos[0]} alt={p.title} className="h-full w-full object-cover transition group-hover:scale-105" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground/40">
                  <ImageIcon className="h-10 w-10" />
                </div>
              )}
            </div>
            <div className="p-5 flex flex-col gap-2 flex-1">
              <h3 className="font-semibold tracking-tight line-clamp-1">{p.title}</h3>
              {p.categories.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {p.categories.slice(0, 3).map((c) => (
                    <Badge key={c} variant="secondary" className="text-[10px]">{t(`cat_${c}`)}</Badge>
                  ))}
                  {p.categories.length > 3 && (
                    <Badge variant="outline" className="text-[10px]">+{p.categories.length - 3}</Badge>
                  )}
                </div>
              )}
              {addressLine(p) && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" />{addressLine(p)}
                </p>
              )}
              {dates(p) && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="h-3 w-3 shrink-0" />{dates(p)}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{active.title}</DialogTitle>
              </DialogHeader>

              {active.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {active.categories.map((c) => (
                    <Badge key={c} variant="secondary">{t(`cat_${c}`)}</Badge>
                  ))}
                </div>
              )}

              {active.photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {active.photos.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={url} src={url} alt={t("photoAlt", { number: i + 1 })} className="aspect-square w-full object-cover rounded-lg border border-border/60" />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("noPhotos")}</p>
              )}

              {active.description && (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{active.description}</p>
              )}

              <div className="text-sm text-muted-foreground space-y-1">
                {addressLine(active) && (
                  <p className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{addressLine(active)}</p>
                )}
                {dates(active) && (
                  <p className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{dates(active)}</p>
                )}
                {(active.lat !== 0 || active.lon !== 0) && (
                  <a
                    href={`https://www.google.com/maps?q=${active.lat},${active.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />{t("openInGoogleMaps")}
                  </a>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
                <PlaceQrButton profileId={profileId} placeId={active.id} />
                {isOwn && (
                  <Button asChild variant="ghost" size="sm" className="gap-1.5">
                    <Link href={`/profile/${profileId}/places/${active.id}/edit`}>
                      <Pencil className="h-4 w-4" />{t("editTitle")}
                    </Link>
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
