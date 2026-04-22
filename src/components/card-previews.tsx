import { Heart, Star, Image as ImageIcon, Flower2, BrickWall } from "lucide-react"
import { getAvatarColor, getAvatarGradient } from "@/lib/avatar-color"
import type { TributeAuthorPreview } from "@/queries/tribute"
import type { FavoriteRow } from "@/queries/favorite"
import type { MemorialRow } from "@/queries/memorial"

export function TreePreview() {
  return (
    <svg viewBox="0 0 240 110" className="w-full h-full" aria-hidden>
      <defs>
        <linearGradient id="tg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--brand-indigo))" />
          <stop offset="100%" stopColor="hsl(var(--brand-slate))" />
        </linearGradient>
      </defs>
      <g stroke="hsl(var(--muted-foreground) / 0.4)" strokeWidth="1.2" fill="none">
        <path d="M110 22 V40 M48 64 V46 H172 V58" />
        <path d="M20 96 V80 H82 V96 M48 96 V80" />
        <path d="M140 96 V76 H210 V96" />
        <path d="M110 22 H196 V40" />
      </g>
      {[
        { cx: 110, cy: 18, r: 10, fill: "url(#tg)" },
        { cx: 48,  cy: 70, r: 8  },
        { cx: 172, cy: 64, r: 7  },
        { cx: 196, cy: 46, r: 5  },
        { cx: 20,  cy: 100, r: 6 },
        { cx: 48,  cy: 100, r: 7 },
        { cx: 82,  cy: 100, r: 5 },
        { cx: 140, cy: 100, r: 6 },
        { cx: 210, cy: 100, r: 8 },
      ].map((n, i) => (
        <circle
          key={i}
          cx={n.cx}
          cy={n.cy}
          r={n.r}
          fill={n.fill ?? "hsl(var(--card))"}
          stroke="hsl(var(--brand-indigo) / 0.6)"
          strokeWidth="1.4"
        />
      ))}
    </svg>
  )
}

export function BioPreview() {
  const bar = "h-2.5 rounded-full skeleton-block"
  const thumb = "rounded-xl skeleton-block shrink-0"
  return (
    <div className="space-y-3.5">
      <div className="flex gap-3 items-start">
        <div className={`${thumb} h-14 w-14`} />
        <div className="flex-1 space-y-2 pt-1">
          <div className={`${bar} w-full`} />
          <div className={`${bar} w-[88%]`} />
          <div className={`${bar} w-[55%]`} />
        </div>
      </div>
      <div className="space-y-2">
        <div className={`${bar} w-[95%]`} />
        <div className={`${bar} w-[82%]`} />
        <div className={`${bar} w-[60%]`} />
      </div>
    </div>
  )
}

export function GalleryPreview({ images }: { images: string[] }) {
  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 py-4">
        <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">No media yet.</p>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-4 gap-1.5 h-full">
      {images.slice(0, 4).map((src, i) => (
        <div key={i} className="relative rounded-lg overflow-hidden bg-muted aspect-square">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        </div>
      ))}
    </div>
  )
}

export function TributesPreview({ authors }: { authors: TributeAuthorPreview[] }) {
  if (authors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 py-4">
        <Flower2 className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">No tributes yet.</p>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {authors.slice(0, 4).map((a, i) => {
          const initials = `${a.firstName[0]}${a.lastName[0]}`.toUpperCase()
          const color = getAvatarColor(a.id)
          return (
            <div
              key={i}
              className={`h-7 w-7 rounded-full ${color} ring-2 ring-background flex items-center justify-center text-[10px] font-bold text-white overflow-hidden`}
            >
              {a.avatarUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={a.avatarUrl} alt={initials} className="h-full w-full object-cover" />
                : initials}
            </div>
          )
        })}
        {authors.length > 4 && (
          <div className="h-7 w-7 rounded-full bg-muted ring-2 ring-background flex items-center justify-center text-[10px] font-medium text-muted-foreground">
            +
          </div>
        )}
      </div>
    </div>
  )
}

export function FavoritesPreview({ favorites }: { favorites: FavoriteRow[] }) {
  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 py-4">
        <Heart className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">No favorites yet.</p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {favorites.slice(0, 3).map((fav) => {
        const t = fav.target
        const name = `${t.firstName} ${t.lastName}`
        const initials = `${t.firstName[0]}${t.lastName[0]}`.toUpperCase()
        const gradient = getAvatarGradient(t.id)
        return (
          <div key={fav.targetId} className="flex items-center gap-2.5">
            <div
              className={`h-7 w-7 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-[10px] font-semibold ring-2 ring-background overflow-hidden shrink-0`}
            >
              {t.avatarUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={t.avatarUrl} alt={initials} className="h-full w-full object-cover" />
                : initials}
            </div>
            <p className="flex-1 min-w-0 text-xs font-medium truncate">{name}</p>
            <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500 shrink-0" />
          </div>
        )
      })}
    </div>
  )
}

export function GuardianPreview({ memorials }: { memorials: MemorialRow[] }) {
  if (memorials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 py-4">
        <BrickWall className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">No profiles guarded yet.</p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {memorials.slice(0, 3).map((m) => {
        const name = `${m.firstName} ${m.lastName}`
        const initials = `${m.firstName[0]}${m.lastName[0]}`.toUpperCase()
        return (
          <div key={m.id} className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-gradient-brand flex items-center justify-center text-white text-[10px] font-semibold overflow-hidden shrink-0">
              {m.avatarUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={m.avatarUrl} alt={initials} className="h-full w-full object-cover" />
                : initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{name}</p>
            </div>
            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
          </div>
        )
      })}
    </div>
  )
}

export function GeoPreview({ lat, lng }: { lat?: number | null; lng?: number | null }) {
  const resolvedLat = lat ?? -22.959167
  const resolvedLng = lng ?? -43.188333
  const mapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${resolvedLat},${resolvedLng}&zoom=14&size=400x200&markers=${resolvedLat},${resolvedLng},red-pushpin`
  return (
    <div className="relative h-full w-full min-h-[120px] rounded-xl overflow-hidden bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mapUrl} alt="Map" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/30 to-transparent" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-primary ring-2 ring-background" />
        </span>
      </div>
    </div>
  )
}

export function QrPreview({ dataUrl }: { dataUrl: string }) {
  return (
    <div className="flex justify-center">
      <div className="bg-white p-2 rounded-xl shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl} alt="QR code" className="h-24 w-24" />
      </div>
    </div>
  )
}
