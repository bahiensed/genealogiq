import Link from "next/link"

type Context = "bio" | "gallery" | "memorialized" | "geolocation" | "tree"

const QUESTION: Record<Context, string> = {
  bio:          "Need more characters and images?",
  gallery:      "Need more images and videos?",
  memorialized: "Need more memorialized profiles?",
  geolocation:  "Need precise GPS coordinates?",
  tree:         "Need a bigger tree?",
}

interface Props {
  context:     Context
  currentTier: string
  inline?:     boolean
}

export function UpgradeHint({ context, currentTier, inline = false }: Props) {
  // Top tier — nothing to upsell.
  if (currentTier === "CENTURY") return null

  const content = (
    <>
      {QUESTION[context]}{" "}
      <Link href="/plans" className="text-primary hover:underline">
        Upgrade your plan.
      </Link>
    </>
  )

  if (inline) return content
  return <p className="text-xs text-muted-foreground">{content}</p>
}
