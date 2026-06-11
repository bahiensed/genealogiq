"use client"

import { useEffect, useRef, useState } from "react"
import { useLocale } from "next-intl"
import { getCountryName } from "@genealogiq/core"
import { Heart } from "lucide-react"
import { ProfileMiniCard, type MiniProfile, type AvatarGradient } from "@/components/profile-mini-card"
import type { FavoriteRow } from "@/queries/favorite"

const PAGE_SIZE = 12

const GRADIENTS: AvatarGradient[] = ["brand", "indigo", "violet", "sky", "rose", "amber", "emerald"]

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function toMiniProfile(fav: FavoriteRow, index: number, locale: string): MiniProfile {
  const t = fav.target
  const name = `${t.firstName} ${t.lastName}`
  const isMemorialized = t.role === "APP_MEMO"
  const subtitle = t.birthPlace
    ? `${t.birthPlace}${t.birthCountry ? `, ${getCountryName(t.birthCountry, locale)}` : ""}`
    : isMemorialized
      ? "Memorialized profile"
      : ""
  return {
    id: t.id,
    name,
    subtitle,
    status: isMemorialized ? "Memorialized" : "Living",
    metric: isMemorialized && t.deathDate
      ? `✦ ${t.deathDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`
      : t.birthDate
        ? `Born ${t.birthDate.toLocaleDateString("en-US", { year: "numeric", month: "short" })}`
        : "",
    initials: `${t.firstName[0]}${t.lastName[0]}`.toUpperCase(),
    gradient: GRADIENTS[index % GRADIENTS.length],
    href: `/profile/${t.id}`,
    avatarUrl: t.avatarUrl,
  }
}

interface Props {
  items: FavoriteRow[]
}

export function FavoritesClient({ items }: Props) {
  const locale = useLocale()
  // Start with original order (SSR-safe); shuffle client-side on mount to avoid hydration mismatch
  const [shuffled, setShuffled] = useState(items)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setShuffled(shuffle(items))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (visibleCount >= shuffled.length) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisibleCount((c) => Math.min(c + PAGE_SIZE, shuffled.length))
      },
      { rootMargin: "300px" },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [visibleCount, shuffled.length])

  if (items.length === 0) {
    return (
      <div className="glass-card flex flex-col items-center justify-center gap-3 py-20 text-center animate-fade-in">
        <Heart className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">No favorites yet.</p>
      </div>
    )
  }

  const visible = shuffled.slice(0, visibleCount)

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: "80ms" }}>
        {visible.map((fav, i) => {
          const isMemorialized = fav.target.role === "APP_MEMO"
          return (
            <ProfileMiniCard
              key={fav.targetId}
              profile={toMiniProfile(fav, i, locale)}
              delay={i * 40}
              hideLivingBadge={!isMemorialized}
            />
          )
        })}
      </div>

      {visibleCount < shuffled.length && (
        <div ref={sentinelRef} className="h-16" aria-hidden />
      )}
    </>
  )
}
