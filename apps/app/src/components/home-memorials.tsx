"use client"

import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { getCountryName } from "@genealogiq/core"
import { ProfileMiniCard, type MiniProfile } from "@/components/profile-mini-card"
import { getProfileGradient } from "@/lib/avatar-color"
import type { MemorialRow } from "@/queries/memorial"

/** How many cards this section renders — also the point above which a
 *  "see all" link is worth showing. Exported so the two cannot drift. */
export const VISIBLE = 6

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

type Translate = (key: string, values?: Record<string, string>) => string

function toMiniProfile(m: MemorialRow, locale: string, t: Translate): MiniProfile {
  return {
    id: m.id,
    name: `${m.firstName} ${m.lastName}`,
    subtitle: m.birthPlace
      ? `${m.birthPlace}${m.birthCountry ? `, ${getCountryName(m.birthCountry, locale)}` : ""}`
      : t("memorializedProfile"),
    status: "Memorialized",
    metric: m.deathDate
      ? t("deathMetric", { date: m.deathDate.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" }) })
      : m.birthDate
        ? t("bornMetric", { date: m.birthDate.toLocaleDateString(locale, { year: "numeric", month: "short" }) })
        : "",
    initials: `${m.firstName[0]}${m.lastName[0]}`.toUpperCase(),
    gradient: getProfileGradient(m.id),
    href: `/profile/${m.id}`,
    avatarUrl: m.avatarUrl,
  }
}

interface Props {
  items: MemorialRow[]
}

export function HomeMemorials({ items }: Props) {
  const locale = useLocale()
  const t = useTranslations("Home")
  const [order, setOrder] = useState(items)

  useEffect(() => {
    setOrder(shuffle(items))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visible = order.slice(0, VISIBLE)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {visible.map((m, i) => (
        <ProfileMiniCard key={m.id} profile={toMiniProfile(m, locale, t)} delay={i * 40} />
      ))}
    </div>
  )
}
