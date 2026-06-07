import { describe, it, expect } from "vitest"
import {
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION_MS,
  isLocked,
  lockoutRemainingMinutes,
  nextFailedLoginState,
} from "./lockout"

const now = new Date("2026-06-07T12:00:00Z")

describe("lockout policy", () => {
  it("treats only a future lockedUntil as locked", () => {
    expect(isLocked(null, now)).toBe(false)
    expect(isLocked(new Date(now.getTime() - 1000), now)).toBe(false)
    expect(isLocked(new Date(now.getTime() + 1000), now)).toBe(true)
  })

  it("reports remaining minutes (ceil), or null when not locked", () => {
    expect(lockoutRemainingMinutes(null, now)).toBeNull()
    expect(lockoutRemainingMinutes(new Date(now.getTime() - 1000), now)).toBeNull()
    expect(lockoutRemainingMinutes(new Date(now.getTime() + 5 * 60 * 1000), now)).toBe(5)
    expect(lockoutRemainingMinutes(new Date(now.getTime() + 61 * 1000), now)).toBe(2)
  })

  it("increments attempts and locks exactly at the threshold", () => {
    expect(nextFailedLoginState({ failedLoginAttempts: 0, lockedUntil: null }, now)).toEqual({
      failedLoginAttempts: 1,
      lockedUntil: null,
    })
    expect(nextFailedLoginState({ failedLoginAttempts: MAX_FAILED_ATTEMPTS - 1, lockedUntil: null }, now)).toEqual({
      failedLoginAttempts: MAX_FAILED_ATTEMPTS,
      lockedUntil: new Date(now.getTime() + LOCKOUT_DURATION_MS),
    })
  })

  it("resets the counter when a stale (expired) lock is present", () => {
    const stale = new Date(now.getTime() - 1000)
    expect(nextFailedLoginState({ failedLoginAttempts: 9, lockedUntil: stale }, now)).toEqual({
      failedLoginAttempts: 1,
      lockedUntil: null,
    })
  })
})
