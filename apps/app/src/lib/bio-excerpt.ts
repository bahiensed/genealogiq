// Truncate biography text to a short preview for anonymous visitors. Cuts at a word
// boundary near the limit and appends an ellipsis only when something was removed.
export function bioExcerpt(text: string, maxChars = 400): { text: string; truncated: boolean } {
  const trimmed = text.trim()
  if (trimmed.length <= maxChars) return { text: trimmed, truncated: false }

  const slice = trimmed.slice(0, maxChars)
  const lastSpace = slice.lastIndexOf(" ")
  const cut = lastSpace > maxChars * 0.6 ? slice.slice(0, lastSpace) : slice
  return { text: cut.trimEnd() + "…", truncated: true }
}
