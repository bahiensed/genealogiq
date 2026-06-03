/** Formats a raw 16-char license code for display: GQL7K2P9MNRX4FT2 → GQL7-K2P9-MNRX-4FT2 */
export function formatGenCode(raw: string): string {
  return raw.replace(/(.{4})/g, "$1-").slice(0, 19)
}
