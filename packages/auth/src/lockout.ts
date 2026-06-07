// Canonical account-lockout policy — one source of truth for all three apps.
// Previously these magic numbers (5 attempts, 15 min) and the stale-lock reset
// were copy-pasted into each app's sign-in action and could silently drift.

export const MAX_FAILED_ATTEMPTS = 5
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes

/** True while `lockedUntil` is in the future. */
export function isLocked(lockedUntil: Date | null, now: Date = new Date()): boolean {
  return !!lockedUntil && lockedUntil > now
}

/** Whole minutes until the lock lifts, or null if not currently locked. */
export function lockoutRemainingMinutes(lockedUntil: Date | null, now: Date = new Date()): number | null {
  if (!lockedUntil || lockedUntil <= now) return null
  return Math.ceil((lockedUntil.getTime() - now.getTime()) / 60000)
}

/**
 * Compute the next lockout state after a failed sign-in. A stale (already
 * expired) lock resets the counter before incrementing; the account re-locks
 * once attempts reach MAX_FAILED_ATTEMPTS.
 */
export function nextFailedLoginState(
  current: { failedLoginAttempts: number; lockedUntil: Date | null },
  now: Date = new Date(),
): { failedLoginAttempts: number; lockedUntil: Date | null } {
  const base = current.lockedUntil && current.lockedUntil < now ? 0 : current.failedLoginAttempts
  const newCount = base + 1
  return {
    failedLoginAttempts: newCount,
    lockedUntil: newCount >= MAX_FAILED_ATTEMPTS ? new Date(now.getTime() + LOCKOUT_DURATION_MS) : null,
  }
}
