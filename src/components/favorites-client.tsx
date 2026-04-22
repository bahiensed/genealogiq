'use client'

import { Heart } from "lucide-react"
import { ProfileMiniCard, type MiniProfile, type AvatarGradient } from "@/components/profile-mini-card"
import type { FavoriteRow } from "@/queries/favorite"

const GRADIENTS: AvatarGradient[] = ["brand", "indigo", "violet", "sky", "rose", "amber", "emerald"]

function toMiniProfile(fav: FavoriteRow, index: number): MiniProfile {
  const t = fav.target
  const name = `${t.firstName} ${t.lastName}`
  const isMemorialized = t.role === "APP_MEMO"
  const subtitle = t.birthPlace
    ? `${t.birthPlace}${t.birthCountry ? `, ${t.birthCountry}` : ""}`
    : isMemorialized
      ? "Memorialized profile"
      : "Living profile"
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
  }
}

interface Props {
  items: FavoriteRow[]
}

export function FavoritesClient({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="glass-card flex flex-col items-center justify-center gap-3 py-20 text-center animate-fade-in">
        <Heart className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">No favorites yet.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: "80ms" }}>
      {items.map((fav, i) => (
        <ProfileMiniCard key={fav.targetId} profile={toMiniProfile(fav, i)} delay={i * 40} />
      ))}
    </div>
  )
}
