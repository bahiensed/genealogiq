import { describe, it, expect } from "vitest"
import { DISMISS_COOLDOWN_MS, isDismissedWithinCooldown, isIosDevice } from "./pwa-install"

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
const IPAD_UA =
  "Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
// iPadOS 13+ masquerades as desktop Safari on macOS.
const IPADOS_DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15"
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36"
const WINDOWS_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

describe("isIosDevice", () => {
  it("detects an iPhone by user agent", () => {
    expect(isIosDevice(IPHONE_UA, "iPhone", 5)).toBe(true)
  })

  it("detects an older iPad by user agent", () => {
    expect(isIosDevice(IPAD_UA, "iPad", 5)).toBe(true)
  })

  it("detects iPadOS 13+ masquerading as macOS via touch points", () => {
    expect(isIosDevice(IPADOS_DESKTOP_UA, "MacIntel", 5)).toBe(true)
  })

  it("does not flag a real Mac (no touchscreen)", () => {
    expect(isIosDevice(IPADOS_DESKTOP_UA, "MacIntel", 0)).toBe(false)
  })

  it("does not flag Android", () => {
    expect(isIosDevice(ANDROID_UA, "Linux armv81", 5)).toBe(false)
  })

  it("does not flag Windows", () => {
    expect(isIosDevice(WINDOWS_UA, "Win32", 0)).toBe(false)
  })
})

describe("isDismissedWithinCooldown", () => {
  const now = 1_800_000_000_000

  it("is true right after a dismissal", () => {
    expect(isDismissedWithinCooldown(String(now - 1000), now)).toBe(true)
  })

  it("is false once the cooldown has fully elapsed", () => {
    const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000
    expect(isDismissedWithinCooldown(String(threeDaysAgo), now)).toBe(false)
  })

  it("is false exactly at the cooldown boundary", () => {
    expect(isDismissedWithinCooldown(String(now - DISMISS_COOLDOWN_MS), now)).toBe(false)
  })

  it("is true one millisecond before the boundary", () => {
    expect(isDismissedWithinCooldown(String(now - DISMISS_COOLDOWN_MS + 1), now)).toBe(true)
  })

  it("is false for a missing value", () => {
    expect(isDismissedWithinCooldown(null, now)).toBe(false)
  })

  it("is false for a malformed value", () => {
    expect(isDismissedWithinCooldown("not-a-timestamp", now)).toBe(false)
  })
})
