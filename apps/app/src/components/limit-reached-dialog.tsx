"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import type { LucideIcon } from "lucide-react"
import { Network, BookOpenText, FileText, Images, Film, MapPin, BrickWall, QrCode } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ALLOWS_EXTRA_PURCHASE, type PlanQuotas, type PlanTier } from "@/lib/plan-quotas"

export type LimitReachedContext =
  | "tree"
  | "bio"
  | "documents"
  | "media-images"
  | "media-videos"
  | "geoPlaces"
  | "memorials"
  | "qrCode"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  context: LimitReachedContext
  limit: number
  tier: PlanTier
}

const CONTEXT_ICON: Record<LimitReachedContext, LucideIcon> = {
  tree: Network,
  bio: BookOpenText,
  documents: FileText,
  "media-images": Images,
  "media-videos": Film,
  geoPlaces: MapPin,
  memorials: BrickWall,
  qrCode: QrCode,
}

// i18n keys are camelCase (matches every other namespace in messages/*.json)
// even though the context type itself uses "media-images"/"media-videos".
const CONTEXT_I18N_KEY: Record<LimitReachedContext, string> = {
  tree: "tree",
  bio: "bio",
  documents: "documents",
  "media-images": "mediaImages",
  "media-videos": "mediaVideos",
  geoPlaces: "geoPlaces",
  memorials: "memorials",
  qrCode: "qrCode",
}

// Which PlanQuotas field governs each context — used to look up
// ALLOWS_EXTRA_PURCHASE, a property of the module, not of the tier.
const CONTEXT_QUOTA_KEY: Record<LimitReachedContext, keyof PlanQuotas> = {
  tree: "treeMaxMembers",
  bio: "bioMaxChars",
  documents: "documentsMax",
  "media-images": "mediaMaxImages",
  "media-videos": "mediaMaxVideos",
  geoPlaces: "geoPlacesMax",
  memorials: "memorialsMax",
  qrCode: "qrCodeMax",
}

export function LimitReachedDialog({ open, onOpenChange, context, limit, tier }: Props) {
  const t = useTranslations("LimitReached")
  const Icon = CONTEXT_ICON[context]
  const i18nKey = CONTEXT_I18N_KEY[context]
  const allowsExtra = !!ALLOWS_EXTRA_PURCHASE[CONTEXT_QUOTA_KEY[context]]

  // FREE always has a real higher tier to sell. Already-paying tiers
  // (PREMIUM/PHYSICAL_QR) only get the extra-purchase hint where the module
  // actually allows one; otherwise there's nothing further to offer beyond
  // acknowledging the limit — the CTA still points at /subscriptions (where
  // the current plan and its options are visible) rather than disappearing.
  const variant: "upgradeOrExtra" | "upgradeOnly" | "extraOnly" | "maxedOut" =
    tier === "FREE"
      ? allowsExtra ? "upgradeOrExtra" : "upgradeOnly"
      : allowsExtra ? "extraOnly" : "maxedOut"

  const ctaKey: "upgrade" | "extraOnly" | "maxedOut" =
    variant === "extraOnly" || variant === "maxedOut" ? variant : "upgrade"

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Icon className="text-primary" />
          </AlertDialogMedia>
          <AlertDialogTitle>{t(`title.${i18nKey}`)}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(`description.${i18nKey}`, { limit })} {t(`suffix.${variant}`)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("dismiss")}</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Link href="/subscriptions">{t(`cta.${ctaKey}`)}</Link>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
