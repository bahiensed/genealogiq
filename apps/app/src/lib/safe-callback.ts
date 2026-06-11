/**
 * Validates a post-auth redirect target. Accepts only an internal path: it must
 * start with "/" and not with "//" (a protocol-relative URL like "//evil.com"
 * would be an open redirect). Returns the path when safe, otherwise null so the
 * caller can fall back to its own default.
 */
export function safeCallback(raw: string | null | undefined): string | null {
  if (!raw) return null
  if (!raw.startsWith("/") || raw.startsWith("//")) return null
  return raw
}
