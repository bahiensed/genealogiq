import Link from "next/link"
import { getTranslations, getLocale } from "next-intl/server"
import { MapPin, MapPinPlus, CalendarDays } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDateRange } from "@/lib/format-date"
import type { GeoPlaceRow } from "@/queries/places"

function addressLine(p: GeoPlaceRow): string | null {
  const parts = [p.city, p.state, p.country].filter(Boolean)
  return parts.length ? parts.join(", ") : null
}

interface Props {
  places: GeoPlaceRow[]
  profileId: string
  isOwn: boolean
}

export async function PlacesClient({ places, profileId, isOwn }: Props) {
  const t = await getTranslations("Places")
  const locale = await getLocale()

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

  const dates = (p: GeoPlaceRow) => formatDateRange(p.startDate, p.endDate, locale)

  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 md:gap-5">
      {places.map((p, i) => (
        <Link
          key={p.id}
          href={`/profile/${profileId}/places/${p.id}`}
          className="block mb-4 md:mb-5 break-inside-avoid rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <article
            className="glass-card no-sheen group overflow-hidden animate-fade-in"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            {p.photos[0] && (
              <div className="relative w-full overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.photos[0]}
                  alt={p.title}
                  className="w-full h-auto block transition group-hover:scale-105"
                />
              </div>
            )}
            <div className="p-5 flex flex-col gap-2">
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
          </article>
        </Link>
      ))}
    </div>
  )
}
