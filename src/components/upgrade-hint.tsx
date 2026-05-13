import Link from "next/link"

type Context = "bio" | "gallery" | "memorialized" | "geolocation" | "tree"

const QUESTION: Record<Context, string> = {
  bio:          "Need more characters and images?",
  gallery:      "Need more images and videos?",
  memorialized: "Need more memorialized profiles?",
  geolocation:  "Need precise GPS coordinates?",
  tree:         "Need more relatives?",
}

interface Props {
  context:     Context
  currentTier: string
}

export function UpgradeHint({ context, currentTier }: Props) {
  // Top tier — nothing to upsell.
  if (currentTier === "CENTURY") return null

  return (
    <p className="text-xs text-muted-foreground">
      {QUESTION[context]}{" "}
      <Link href="/plans" className="text-primary hover:underline">
        Upgrade your plan.
      </Link>
    </p>
  )
}
