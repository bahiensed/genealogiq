"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"

type Context = "bio" | "gallery" | "memorialized" | "geolocation" | "tree"

interface Props {
  context:     Context
  currentTier: string
  inline?:     boolean
}

export function UpgradeHint({ context, currentTier, inline = false }: Props) {
  const t = useTranslations("Subscriptions")

  // Top tier — nothing to upsell.
  if (currentTier === "CENTURY") return null

  const content = (
    <>
      {t(`upgradeHint.question.${context}`)}{" "}
      <Link href="/subscriptions" className="text-primary hover:underline">
        {t("upgradeHint.cta")}
      </Link>
    </>
  )

  if (inline) return content
  return <p className="text-xs text-muted-foreground">{content}</p>
}
