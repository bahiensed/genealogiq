"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"

type Context = "bio" | "gallery" | "memorialized" | "geolocation" | "tree" | "pets"

interface Props {
  context:     Context
  currentTier: string
  inline?:     boolean
}

export function UpgradeHint({ context, currentTier, inline = false }: Props) {
  const t = useTranslations("Subscriptions")

  // NOTE: there used to be a "top tier — nothing to upsell" bail-out here for
  // the hardcoded PHYSICAL_QR tier, which no longer exists. With FREE/PREMIUM
  // the hint is always shown, exactly as it already behaved for both of them.
  // If a tier above PREMIUM is ever added, gate on the plan's price rather
  // than on a code string.

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
