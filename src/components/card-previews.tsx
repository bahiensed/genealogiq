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

// Generates a baseline of varied glyph-like shapes — vowels (small bumps),
// m/n (double bumps), u-dips, sweeps (s/c) and word breaks — to evoke
// medieval cursive scholastic script.
function manuscriptLine(y: number, x0: number, length: number, seed: number): string {
  let d = `M${x0} ${y}`
  let x = x0
  let i = 0
  while (x < x0 + length) {
    const h = 1.6 + Math.abs(Math.sin(i * 0.85 + seed)) * 1.1
    const v = ((i * 1.7 + seed * 2.1) * 0.5 + 100) % 10
    if (v < 1.2) {
      // word break (small pen lift)
      const gap = 1.4
      d += ` m ${gap.toFixed(2)} 0`
      x += gap
    } else if (v < 4) {
      // single vowel/c bump (a, e, i, o, c)
      const w = 2.6
      const dir = i % 2 === 0 ? -1 : 1
      d += ` q ${(w / 2).toFixed(2)} ${(dir * h).toFixed(2)} ${w} 0`
      x += w
    } else if (v < 6.5) {
      // m/n double bump
      const w = 1.8
      d += ` q ${(w / 2).toFixed(2)} -${h.toFixed(2)} ${w} 0`
      d += ` q ${(w / 2).toFixed(2)} -${h.toFixed(2)} ${w} 0`
      x += w * 2
    } else if (v < 8) {
      // u-like dip
      const w = 2.6
      d += ` q ${(w / 2).toFixed(2)} ${h.toFixed(2)} ${w} 0`
      x += w
    } else {
      // wider sweep (s, c long form)
      const w = 3.5
      const dir = (i + 1) % 2 === 0 ? -1 : 1
      d += ` q ${(w / 2).toFixed(2)} ${(dir * h * 0.7).toFixed(2)} ${w} 0`
      x += w
    }
    i++
  }
  return d
}

// Generates the vertical strokes that hover above/below the baseline:
// tall ascenders (b, d, h, l, k) often with a top curl,
// cross-stroked verticals (t, f) with optional descender,
// long descenders (g, y, j) with bottom curl, short descenders (p, q).
function manuscriptStrokes(y: number, x0: number, length: number, seed: number): string {
  const parts: string[] = []
  const stride = 4
  const count = Math.floor(length / stride)
  for (let i = 0; i < count; i++) {
    const x = x0 + i * stride + (i % 3) * 0.6
    const r = Math.sin(x * 0.43 + seed * 1.7)
    const r2 = Math.cos(x * 0.31 + seed * 2.3)

    if (r > 0.7) {
      // tall ascender (b, d, h, l, k)
      const ht = 7 + r * 2.5
      parts.push(`M${x.toFixed(1)} ${y} v-${ht.toFixed(2)}`)
      if (r2 > 0.4) {
        // small curl at top
        parts.push(`M${x.toFixed(1)} ${(y - ht).toFixed(2)} q 1 -1.2 2.2 0.5`)
      }
    } else if (r > 0.55) {
      // cross-stroked tall (t, f)
      const ht = 6 + r * 1.8
      parts.push(`M${x.toFixed(1)} ${y} v-${ht.toFixed(2)}`)
      parts.push(`M${(x - 1.2).toFixed(1)} ${(y - ht + 2.2).toFixed(2)} h 2.5`)
      if (r2 > 0.5) {
        // f sometimes has a descender
        parts.push(`M${x.toFixed(1)} ${y} v ${(2 + r2 * 1.5).toFixed(2)}`)
      }
    } else if (r < -0.7) {
      // long descender with curl (g, y, j)
      const dp = 5 + Math.abs(r) * 2.5
      parts.push(`M${x.toFixed(1)} ${y} v${dp.toFixed(2)}`)
      if (r2 > 0.2) {
        parts.push(`M${x.toFixed(1)} ${(y + dp).toFixed(2)} q -0.6 1 -1.8 0.4`)
      }
    } else if (r < -0.55) {
      // short descender (p, q)
      const dp = 3.5 + Math.abs(r) * 1.5
      parts.push(`M${x.toFixed(1)} ${y} v${dp.toFixed(2)}`)
    }
  }
  return parts.join(" ")
}

export function BioPreview({
  hasBio = false,
  initial1 = "A",
  initial2 = "B",
}: {
  hasBio?: boolean
  initial1?: string
  initial2?: string
}) {
  if (!hasBio) {
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

  // Manuscript-style preview — evokes a medieval scholastic autograph (Aquinas-esque).
  // Two paragraphs: capital "B" with 5 lines, then "G" with 4 lines.
  const lines = [
    // Paragraph 1 (drop cap B) — line spacing 14
    { y: 16,  x: 30, len: 204, s: 1.2 },
    { y: 30,  x: 30, len: 206, s: 2.7 },
    { y: 44,  x: 6,  len: 228, s: 3.4 },
    { y: 58,  x: 6,  len: 224, s: 4.1 },
    { y: 72,  x: 6,  len: 150, s: 5.6 },
    // (blank y≈86 — paragraph break)
    // Paragraph 2 (drop cap G)
    { y: 100, x: 30, len: 204, s: 6.3 },
    { y: 114, x: 30, len: 206, s: 7.0 },
    { y: 128, x: 6,  len: 224, s: 7.9 },
    { y: 142, x: 6,  len: 50,  s: 8.6 },
  ]

  return (
    <svg
      viewBox="0 0 240 152"
      preserveAspectRatio="xMidYMin meet"
      className="w-full h-full text-foreground/55"
      aria-hidden
    >
      <text
        x="3"
        y="33"
        fontFamily="serif"
        fontSize="32"
        fontWeight="700"
        fontStyle="italic"
        fill="currentColor"
        className="text-[hsl(var(--brand-indigo-deep))] dark:text-[hsl(var(--brand-slate-soft))]"
      >{initial1.toUpperCase()}</text>
      <text
        x="3"
        y="117"
        fontFamily="serif"
        fontSize="32"
        fontWeight="700"
        fontStyle="italic"
        fill="currentColor"
        className="text-[hsl(var(--brand-indigo-deep))] dark:text-[hsl(var(--brand-slate-soft))]"
      >{initial2.toUpperCase()}</text>
      <g
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {lines.map((l, i) => (
          <path key={`l-${i}`} d={manuscriptLine(l.y, l.x, l.len, l.s)} />
        ))}
        {lines.map((l, i) => (
          <path key={`s-${i}`} d={manuscriptStrokes(l.y, l.x, l.len, l.s)} />
        ))}
      </g>
    </svg>
  )
}

// SMPTE-inspired color bars — shown when the gallery has only videos and no
// thumbnails, evoking the analog "no-signal" pattern.
function TvBarsPreview() {
  const bars = [
    "#c0c0c0", // gray
    "#c0c000", // yellow
    "#00c0c0", // cyan
    "#00c000", // green
    "#c000c0", // magenta
    "#c00000", // red
    "#0000c0", // blue
  ]
  return (
    <div className="flex h-full w-full overflow-hidden rounded-lg border border-border/60">
      {bars.map((c, i) => (
        <div key={i} className="flex-1" style={{ backgroundColor: c }} />
      ))}
    </div>
  )
}

export function GalleryPreview({ images, hasVideos = false }: { images: string[]; hasVideos?: boolean }) {
  if (images.length === 0) {
    if (hasVideos) return <TvBarsPreview />
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

function osmTileUrl(lat: number, lon: number, zoom: number) {
  const n = Math.pow(2, zoom)
  const x = Math.floor(((lon + 180) / 360) * n)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n)
  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`
}

export function GeoPreview({ lat, lon }: { lat?: number | null; lon?: number | null }) {
  const resolvedLat = lat ?? -22.959167
  const resolvedLng = lon ?? -43.188333
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
