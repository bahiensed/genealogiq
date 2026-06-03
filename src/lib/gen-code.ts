import { randomBytes } from "crypto"

// Alphabet excludes ambiguous characters: 0/O, 1/I/l.
// 32 characters = 5 bits per character.
// 16 bytes → 16 characters × 5 bits = 80 bits of entropy.
// 256 % 32 === 0, so there is no modulo bias.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

/** Generates a cryptographically random 16-character URL-safe license code. */
export function generateGenCode(): string {
  const bytes = randomBytes(16)
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("")
}

/** Formats a raw 16-char code for display: GQL7K2P9MNRX4FT2 → GQL7-K2P9-MNRX-4FT2 */
export function formatGenCode(raw: string): string {
  return raw.replace(/(.{4})/g, "$1-").slice(0, 19)
}
