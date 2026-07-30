import type { WikiTreeProfile, WikiTreeSearchResult } from "@/lib/wikitree"

export interface GhostPrefillData {
  firstName:  string
  lastName:   string
  maidenName: string | null
  gender:     "MALE" | "FEMALE" | "OTHER" | null
  birthDate:  string | null
  deathDate:  string | null
  birthPlace: string | null
  deathPlace: string | null
  sourceUrl:  string
}

const MAX_PLACE_LENGTH = 100

export function mapWikiTreeGender(raw: string | null | undefined): "MALE" | "FEMALE" | "OTHER" | null {
  if (raw === "Male") return "MALE"
  if (raw === "Female") return "FEMALE"
  return null
}

/**
 * WikiTree dates are YYYY-MM-DD but use "00" for an unknown month/day, and
 * "0000-00-00" for fully unknown — e.g. "1850-00-00" or "1850-03-00". These
 * are NOT safe to hand to `new Date(...)`: JS silently accepts month/day 0
 * and rolls over to a different, wrong date instead of throwing. Any
 * partial date must become null rather than a fabricated full date.
 */
export function normalizeWikiTreeDate(raw: string | null | undefined): string | null {
  if (!raw) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
  if (!match) return null
  const [, year, month, day] = match
  if (year === "0000" || month === "00" || day === "00") return null
  return raw
}

/** Year-only extraction for display (e.g. search-result rows), never for form prefill. */
export function extractWikiTreeYear(raw: string | null | undefined): number | null {
  if (!raw) return null
  const match = /^(\d{4})-\d{2}-\d{2}$/.exec(raw)
  if (!match || match[1] === "0000") return null
  return Number(match[1])
}

function truncatePlace(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  return trimmed.length > MAX_PLACE_LENGTH ? trimmed.slice(0, MAX_PLACE_LENGTH) : trimmed
}

export function mapWikiTreeProfileToGhostPrefill(profile: WikiTreeProfile): GhostPrefillData {
  const lastName = profile.lastNameCurrent || profile.lastNameAtBirth
  const maidenName =
    profile.lastNameAtBirth && profile.lastNameAtBirth !== lastName ? profile.lastNameAtBirth : null

  return {
    firstName:  profile.firstName,
    lastName,
    maidenName,
    gender:     mapWikiTreeGender(profile.gender),
    birthDate:  normalizeWikiTreeDate(profile.birthDate),
    deathDate:  normalizeWikiTreeDate(profile.deathDate),
    birthPlace: truncatePlace(profile.birthLocation),
    deathPlace: truncatePlace(profile.deathLocation),
    sourceUrl:  `https://www.wikitree.com/wiki/${profile.id}`,
  }
}

export function wikiTreeSearchResultYears(result: WikiTreeSearchResult): { birthYear: number | null; deathYear: number | null } {
  return {
    birthYear: extractWikiTreeYear(result.birthDate),
    deathYear: extractWikiTreeYear(result.deathDate),
  }
}
