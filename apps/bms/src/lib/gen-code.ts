import { randomBytes } from 'crypto'

// Alphabet without 0/O, 1/I/l (visual ambiguity). 32 chars = 5 bits.
// 16 bytes → 16 chars × 5 bits = 80 bits entropy. 256 % 32 = 0 (no bias).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateGenCode(): string {
  const bytes = randomBytes(16)
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}
