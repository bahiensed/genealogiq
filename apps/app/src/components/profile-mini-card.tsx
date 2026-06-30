"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import type { AvatarGradient } from "@/lib/avatar-color"

export type { AvatarGradient }

const gradientMap: Record<AvatarGradient, string> = {
  rose:    "bg-[linear-gradient(135deg,hsl(346_84%_61%),hsl(330_81%_60%))]",
  amber:   "bg-[linear-gradient(135deg,hsl(38_92%_60%),hsl(20_90%_58%))]",
  emerald: "bg-[linear-gradient(135deg,hsl(160_64%_45%),hsl(180_60%_45%))]",
  indigo:  "bg-[linear-gradient(135deg,hsl(240_60%_60%),hsl(260_60%_58%))]",
  violet:  "bg-[linear-gradient(135deg,hsl(270_70%_62%),hsl(300_65%_60%))]",
  sky:     "bg-[linear-gradient(135deg,hsl(200_85%_58%),hsl(190_80%_55%))]",
  brand:   "bg-gradient-brand",
}

export interface MiniProfile {
  id: string
  name: string
  subtitle: string
  status: "Memorialized" | "Living"
  metric: string
  initials: string
  gradient: AvatarGradient
  href: string
  avatarUrl?: string | null
}

interface ProfileMiniCardProps {
  profile: MiniProfile
  delay?: number
  hideLivingBadge?: boolean
  hideMetric?: boolean
}

export function ProfileMiniCard({ profile, delay = 0, hideLivingBadge, hideMetric }: ProfileMiniCardProps) {
  const t = useTranslations("Home")
  const isMemorial = profile.status === "Memorialized"
  const statusLabel = isMemorial ? t("memorializedBadge") : t("livingBadge")
  const showBadge = isMemorial || !hideLivingBadge
  const showMetric = !hideMetric
  const showFooter = showBadge || showMetric

  return (
    <a
      href={profile.href}
      className="glass-card text-left p-4 w-full flex flex-col gap-3 animate-fade-in opacity-0"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="absolute -inset-0.5 rounded-full bg-gradient-brand opacity-60 blur-sm" />
          <div
            className={cn(
              "relative h-14 w-14 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-[var(--shadow-icon)] overflow-hidden",
              !profile.avatarUrl && gradientMap[profile.gradient],
            )}
          >
            {profile.avatarUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
              : profile.initials}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{profile.name}</p>
          <p className="text-xs text-muted-foreground truncate">{profile.subtitle}</p>
        </div>
      </div>
      {showFooter && (
        <div className="flex items-center justify-between gap-2">
          {showBadge ? (
            <span
              className={cn(
                "text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide",
                isMemorial
                  ? "bg-[hsl(var(--brand-slate)/0.25)] text-[hsl(var(--brand-indigo-deep))] dark:text-[hsl(var(--brand-slate-soft))]"
                  : "bg-gradient-brand-soft text-[hsl(var(--brand-indigo-deep))] dark:text-[hsl(var(--brand-slate-soft))]",
              )}
            >
              {statusLabel}
            </span>
          ) : (
            <span />
          )}
          {showMetric && (
            <span className="text-[11px] text-muted-foreground truncate">{profile.metric}</span>
          )}
        </div>
      )}
    </a>
  )
}
