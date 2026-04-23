import { useState } from "react"
import type { MiniProfile } from "@/components/profile-mini-card"

const KEY = "giq:recently-viewed"
const MAX = 6

export type RecentProfile = MiniProfile & { viewedAt: number }

function read(): RecentProfile[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]")
  } catch {
    return []
  }
}

export function recordView(profile: MiniProfile) {
  const existing = read().filter((p) => p.id !== profile.id)
  const updated: RecentProfile[] = [{ ...profile, viewedAt: Date.now() }, ...existing].slice(0, MAX)
  localStorage.setItem(KEY, JSON.stringify(updated))
}

export function useRecentlyViewed() {
  const [profiles] = useState<RecentProfile[]>(() => {
    if (typeof window === "undefined") return []
    return read()
  })
  return profiles
}
