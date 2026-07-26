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

export function formatDateRange(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined,
  locale: string,
): string | null {
  if (start && end) return `${formatDateShort(start, locale)} — ${formatDateShort(end, locale)}`
  if (start) return formatDateShort(start, locale)
  if (end) return formatDateShort(end, locale)
  return null
}

// For real timestamps (createdAt-style) — no forced UTC, local time is correct
// for an actual moment in time. Distinct from the date-only helpers above.
export function formatDateTime(d: Date | string | null | undefined, locale: string): string {
  if (!d) return ""
  const date = typeof d === "string" ? new Date(d) : d
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(date)
}

// pt-BR prose dates use an ordinal "1º" for the first day of the month ("1º de
// agosto de 2001") but a cardinal number for every other day ("13 de outubro
// de 2006") — en-US/es-MX don't use this pattern at all. Intl has no format
// option for it, so the day part is patched after formatToParts() gives us the
// correctly-ordered, correctly-connected parts for the locale.
export function formatDateProse(d: Date | string | null | undefined, locale: string): string {
  if (!d) return ""
  const date = typeof d === "string" ? new Date(d) : d
  const parts = new Intl.DateTimeFormat(locale, {
    day:      "numeric",
    month:    "long",
    year:     "numeric",
    timeZone: "UTC",
  }).formatToParts(date)
  return parts
    .map((part) => (part.type === "day" && locale === "pt-BR" && part.value === "1" ? "1º" : part.value))
    .join("")
}
