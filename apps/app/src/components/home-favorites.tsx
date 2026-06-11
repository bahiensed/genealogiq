"use client"

import { useEffect, useState } from "react"
import { useLocale } from "next-intl"
import { getCountryName } from "@genealogiq/core"
import { ProfileMiniCard, type MiniProfile } from "@/components/profile-mini-card"
import { getProfileGradient } from "@/lib/avatar-color"
import type { FavoriteRow } from "@/queries/favorite"

const VISIBLE = 6

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function toMiniProfile(fav: FavoriteRow, locale: string): MiniProfile {
  const t = fav.target
  const isMemorialized = t.role === "APP_MEMO"
  return {
    id: t.id,
    name: `${t.firstName} ${t.lastName}`,
    subtitle: t.birthPlace
      ? `${t.birthPlace}${t.birthCountry ? `, ${getCountryName(t.birthCountry, locale)}` : ""}`
      : isMemorialized ? "Memorialized profile" : "",
    status: isMemorialized ? "Memorialized" : "Living",
    metric: isMemorialized && t.deathDate
      ? `✦ ${t.deathDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`
      : t.birthDate
        ? `Born ${t.birthDate.toLocaleDateString("en-US", { year: "numeric", month: "short" })}`
        : "",
    initials: `${t.firstName[0]}${t.lastName[0]}`.toUpperCase(),
    gradient: getProfileGradient(t.id),
    href: `/profile/${t.id}`,
    avatarUrl: t.avatarUrl,
  }
}

interface Props {
  items: FavoriteRow[]
}

export function HomeFavorites({ items }: Props) {
  const locale = useLocale()
  // Render the original order on SSR to avoid hydration mismatch; shuffle on mount.
  const [order, setOrder] = useState(items)

  useEffect(() => {
    setOrder(shuffle(items))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visible = order.slice(0, VISIBLE)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {visible.map((fav, i) => (
        <ProfileMiniCard
          key={fav.targetId}
          profile={toMiniProfile(fav, locale)}
          delay={i * 40}
          hideLivingBadge={fav.target.role !== "APP_MEMO"}
        />
      ))}
    </div>
  )
}
