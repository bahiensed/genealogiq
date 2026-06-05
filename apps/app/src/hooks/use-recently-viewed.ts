import { useSyncExternalStore } from "react"
import type { MiniProfile } from "@/components/profile-mini-card"

const KEY = "giq:recently-viewed"
const MAX = 6

export type RecentProfile = MiniProfile & { viewedAt: number }

// Stable empty reference for SSR snapshot — must never change
const EMPTY: RecentProfile[] = []

// Module-level cache so getClientSnapshot returns a stable reference
let clientSnapshot: RecentProfile[] | null = null

function read(): RecentProfile[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]")
  } catch {
    return EMPTY
  }
}

function getClientSnapshot(): RecentProfile[] {
  if (clientSnapshot === null) clientSnapshot = read()
  return clientSnapshot
}

export function recordView(profile: MiniProfile) {
  const existing = read().filter((p) => p.id !== profile.id)
  const updated: RecentProfile[] = [{ ...profile, viewedAt: Date.now() }, ...existing].slice(0, MAX)
  localStorage.setItem(KEY, JSON.stringify(updated))
  clientSnapshot = null // invalidate so next read picks up fresh data
}

export function useRecentlyViewed() {
  return useSyncExternalStore(
    () => () => {},   // no subscription needed — data is read-once per session
    getClientSnapshot,
    () => EMPTY,      // SSR: always returns the same stable reference
  )
}
