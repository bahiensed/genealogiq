import Link from "next/link"
import { ArrowUpRight, Sparkles } from "lucide-react"

type Context = "bio" | "gallery" | "memorialized" | "geolocation"

const COPY: Record<Context, { headline: string; body: string }> = {
  bio: {
    headline: "Room for the whole story",
    body:     "On Década your biography can grow to 10,000 characters and 8 photos. Século unlocks 40,000 characters and 15 photos.",
  },
  gallery: {
    headline: "More photos, more videos",
    body:     "Década keeps up to 50 photos and 10 videos per memorial. Século unlocks 100 photos and 30 videos.",
  },
  memorialized: {
    headline: "Guard more loved ones",
    body:     "Each Década plan adds 2 memorial slots; Século adds 5. One purchase, generations covered.",
  },
  geolocation: {
    headline: "Precise resting place",
    body:     "Paid plans unlock GPS coordinates so visitors can navigate to the exact spot.",
  },
}

interface Props {
  context:     Context
  currentTier: string
}

export function UpgradeHint({ context, currentTier }: Props) {
  // Top tier — nothing to upsell.
  if (currentTier === "CENTURY") return null

  const { headline, body } = COPY[context]

  return (
    <aside className="glass-card no-sheen px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2 shrink-0">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="space-y-0.5">
          <p className="font-semibold tracking-tight">{headline}</p>
          <p className="text-sm text-muted-foreground leading-snug">{body}</p>
        </div>
      </div>
      <Link
        href="/plans"
        className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        Choose plan
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    </aside>
  )
}
