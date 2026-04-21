import { Heart, Star } from "lucide-react"

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
      <div className="flex gap-3 items-start">
        <div className="flex-1 space-y-2 pt-1">
          <div className={`${bar} w-full`} />
          <div className={`${bar} w-[92%]`} />
          <div className={`${bar} w-[78%]`} />
          <div className={`${bar} w-[45%]`} />
        </div>
        <div className={`${thumb} h-14 w-14`} />
      </div>
    </div>
  )
}

export function GalleryPreview({ images }: { images: string[] }) {
  return (
    <div className="grid grid-cols-4 gap-1.5 h-full">
      {images.slice(0, 4).map((src, i) => (
        <div key={i} className="relative rounded-lg overflow-hidden bg-muted aspect-square">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
        </div>
      ))}
    </div>
  )
}

export function TributesPreview() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {(["bg-rose-400", "bg-amber-400", "bg-indigo-400", "bg-emerald-400"] as const).map((c, i) => (
          <div
            key={i}
            className={`h-7 w-7 rounded-full ${c} ring-2 ring-background flex items-center justify-center text-[10px] font-bold text-white`}
          >
            {["A", "M", "L", "P"][i]}
          </div>
        ))}
        <div className="h-7 w-7 rounded-full bg-muted ring-2 ring-background flex items-center justify-center text-[10px] font-medium text-muted-foreground">
          +
        </div>
      </div>
    </div>
  )
}

export function GeoPreview() {
  return (
    <div className="relative h-full w-full min-h-[120px] rounded-xl overflow-hidden bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/map-preview.jpg" alt="Map" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
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

export function QrPreview({ profileId }: { profileId: string }) {
  return (
    <div className="flex justify-center">
      <div className="bg-white p-2 rounded-xl shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?data=genealogiq.app/profile/${profileId}&size=200x200&margin=0`}
          alt="QR code"
          className="h-24 w-24"
          loading="lazy"
        />
      </div>
    </div>
  )
}

export function FavoritesPreview() {
  return (
    <div className="space-y-2">
      {[
        { name: "Joana Almeida",   rel: "Childhood friend",      color: "from-rose-400 to-pink-500"    },
        { name: "Pedro Henrique",  rel: "Cousin",                color: "from-amber-400 to-orange-500" },
        { name: "Oliveira Family", rel: "Collective memorial",   color: "from-indigo-400 to-violet-500" },
      ].map((p) => (
        <div key={p.name} className="flex items-center gap-2.5">
          <div className={`h-7 w-7 rounded-full bg-gradient-to-br ${p.color} flex items-center justify-center text-white text-[10px] font-semibold ring-2 ring-background`}>
            {p.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{p.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{p.rel}</p>
          </div>
          <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500 shrink-0" />
        </div>
      ))}
    </div>
  )
}

export function GuardianPreview() {
  return (
    <div className="space-y-2">
      {[
        { name: "Grandma Lucia",  rel: "Maternal grandmother"  },
        { name: "Uncle Ricardo",  rel: "Uncle"                 },
        { name: "Castro Family",  rel: "Collective memorial"   },
      ].map((p) => (
        <div key={p.name} className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full bg-gradient-brand flex items-center justify-center text-white text-[10px] font-semibold">
            {p.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{p.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{p.rel}</p>
          </div>
          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
        </div>
      ))}
    </div>
  )
}
