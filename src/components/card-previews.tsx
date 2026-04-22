import { Heart, Star, Images, Flower2, BrickWall } from "lucide-react"
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
      <div className="space-y-2">
        <div className={`${bar} w-full`} />
        <div className={`${bar} w-[90%]`} />
        <div className={`${bar} w-[78%]`} />
        <div className={`${bar} w-[50%]`} />
      </div>
    </div>
  )
}

export function GalleryPreview({ images }: { images: string[] }) {
  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 py-4">
        <Images className="h-8 w-8 text-muted-foreground/50" />
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

function osmTileUrl(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom)
  const x = Math.floor(((lng + 180) / 360) * n)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n)
  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`
}

export function GeoPreview({ lat, lng }: { lat?: number | null; lng?: number | null }) {
  const resolvedLat = lat ?? -22.959167
  const resolvedLng = lng ?? -43.188333
  const mapUrl = osmTileUrl(resolvedLat, resolvedLng, 14)
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

const QR_PLACEHOLDER = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAACgCAYAAACLz2ctAAAAAklEQVR4AewaftIAAAQtSURBVO3BUW5jSRIEQY8E739lX2E/hRqABT1OqnvCLH6haslQtWioWjRULRqqFg1Vi178gyT8CVRuJOGGyk8l4UTlJAknKidJ+BOofDdULRqqFg1Vi4aqRUPVoheXVDYk4QkqN5LwLpUTlZMkfJLKhiS8a6haNFQtGqoWDVWLhqpFLx6ShCeoPCEJN1Q+JQk3VD4pCU9Q+amhatFQtWioWjRULRqqFr2o/0vCDZXvknCiUmdD1aKhatFQtWioWjRULXrxH6PyhCR8ShJOVP42Q9WioWrRULVoqFo0VC168RCVP1kSTlR+Kgm/icpvMVQtGqoWDVWLhqpFQ9WiF5eSUGcqJ0k4UTlJwhOS8NsNVYuGqkVD1aKhatFQtSh+4S+UhE9S+ZQknKj8bYaqRUPVoqFq0VC1aKha9OIfJOFE5SQJG1ROVE6ScKLyU0l4gsqNJGxQ+amhatFQtWioWjRULRqqFsUv/CJJOFE5ScKJykkSbqj825JwonIjCScqT0jCicq7hqpFQ9WioWrRULVoqFoUv3CQhCeonCThROUkCScqJ0k4UbmRhBOVn0rCn0DlJAk3VL4bqhYNVYuGqkVD1aKhatGLh6g8IQknKjdUTpJwonIjCd+pnCThROUkCZ+k8gSVkyS8a6haNFQtGqoWDVWLhqpFLz4sCScqN5JwovKEJJyovCsJT1A5ScINlZMknKicJOFThqpFQ9WioWrRULXoxUOS8EkqJ0k4UTlROUnCjSR8p3KShBtJOFG5kYQTlZMknKicJOFE5V1D1aKhatFQtWioWjRULYpfOEjCicqNJPwmKr9FEk5UTpJwonKShCeonCThhsp3Q9WioWrRULVoqFo0VC168cuo3EjCE5JwonKShO9UnpCEE5VPUrmhcpKEdw1Vi4aqRUPVoqFq0VC16MVDknBD5SQJT1A5ScKJyk8l4YbKSRJOkrAhCScqJyrvGqoWDVWLhqpFQ9WioWpR/MJfKAknKidJOFH5qSQ8QeUJSbih8ilD1aKhatFQtWioWjRULXrxD5LwJ1A5UXlCEt6lcqJyIwk3knCickPlJAlPUPluqFo0VC0aqhYNVYuGqkUvLqlsSMKNJNxQOUnCicpvofKEJJyofMpQtWioWjRULRqqFg1Vi148JAlPUPkkld8iCTeS8EkqJ0l4gsp3Q9WioWrRULVoqFo0VC168R+ThBsqJ0l4l8qJyo0k3FA5ScJJEv5tQ9WioWrRULVoqFo0VC168R+jcpKEGyrfJeEkCTdUTlSeoHKShBsqJ0l411C1aKhaNFQtGqoWDVWLXjxE5TdRuaFyIwnvUjlJwkkSfhOVTxmqFg1Vi4aqRUPVoqFq0YtLSfgTJOEJKu9SOUnCicqNJGxIwqcMVYuGqkVD1aKhatFQtSh+oWrJULVoqFo0VC0aqhb9D5sai0l+LRtyAAAAAElFTkSuQmCC"

export function QrPreview() {
  return (
    <div className="flex justify-center">
      <div className="bg-white p-2 rounded-xl shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={QR_PLACEHOLDER} alt="QR code" className="h-24 w-24" />
      </div>
    </div>
  )
}
