// Birth/death/relation/place dates are stored as DateTime but treated as calendar
// dates (no time). Without timeZone: "UTC" they shift by a day in negative-UTC
// time zones (e.g. "1946-06-09" → "Jun 8, 1946" in EST) — every helper here
// forces UTC so the rendered calendar date never depends on the viewer's clock.

export function formatDateLong(d: Date | string | null | undefined, locale: string): string {
  if (!d) return ""
  const date = typeof d === "string" ? new Date(d) : d
  return new Intl.DateTimeFormat(locale, {
    year:     "numeric",
    month:    "long",
    day:      "numeric",
    timeZone: "UTC",
  }).format(date)
}

export function formatDateShort(d: Date | string | null | undefined, locale: string): string {
  if (!d) return ""
  const date = typeof d === "string" ? new Date(d) : d
  return new Intl.DateTimeFormat(locale, {
    year:     "numeric",
    month:    "short",
    day:      "numeric",
    timeZone: "UTC",
  }).format(date)
}

export function formatMonthYear(d: Date | string | null | undefined, locale: string): string {
  if (!d) return ""
  const date = typeof d === "string" ? new Date(d) : d
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", timeZone: "UTC" }).format(date)
}

export function formatYear(d: Date | string | null | undefined): string {
  if (!d) return ""
  const date = typeof d === "string" ? new Date(d) : d
  return new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "UTC" }).format(date)
}
