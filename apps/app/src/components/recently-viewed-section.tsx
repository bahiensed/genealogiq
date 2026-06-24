'use client'

import { Users } from "lucide-react"
import { useTranslations } from "next-intl"
import { ProfileMiniCard } from "@/components/profile-mini-card"
import { useRecentlyViewed } from "@/hooks/use-recently-viewed"

export function RecentlyViewedSection() {
  const t = useTranslations("Home")
  const profiles = useRecentlyViewed()

  if (profiles.length === 0) {
    return (
      <div className="glass-card no-sheen px-6 py-10 flex flex-col items-center justify-center gap-3 text-center">
        <Users className="h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">{t("recentlyViewedEmpty")}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {profiles.slice(0, 6).map((profile, i) => (
        <ProfileMiniCard
          key={profile.id}
          profile={profile}
          delay={i * 40}
          hideLivingBadge={profile.status === "Living"}
        />
      ))}
    </div>
  )
}
