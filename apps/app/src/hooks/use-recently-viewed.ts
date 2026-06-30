import { useSyncExternalStore } from "react"

// v2: stores RAW profile data (dates as ISO strings, a role flag) instead of the
// pre-formatted display strings. The subtitle, death/birth metric and status badge
// are now formatted at render time under the active locale (see RecentlyViewedSection),
// so switching language re-localizes already-viewed cards. Bumping the key from v1
// drops the stale pre-formatted cache.
const KEY = "giq:recently-viewed:v2"
const MAX = 6

export interface RecentProfile {
  id: string
  firstName: string
  lastName: string
  birthPlace: string | null
  birthCountry: string | null
  isMemorialized: boolean
  birthDate: string | null // ISO 8601
  deathDate: string | null // ISO 8601
  avatarUrl: string | null
  viewedAt: number
}

// What recordView accepts — viewedAt is stamped on write.
export type RecentProfileInput = Omit<RecentProfile, "viewedAt">

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

export function recordView(profile: RecentProfileInput) {
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
