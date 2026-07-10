// Pure helpers behind the PWA install prompt (see hooks/use-pwa-install.ts).
// Kept dependency-injected and DOM-free where possible so they are unit-testable
// in the node Vitest environment.

export const PWA_DISMISSED_KEY = "giq:pwa-install-dismissed"
export const PWA_INSTALLED_KEY = "giq:pwa-installed"

/** How long a decline hides the install dialog. */
export const DISMISS_COOLDOWN_MS = 21 * 24 * 60 * 60 * 1000

/**
 * Chromium's install-prompt event (not yet in lib.dom — it's a
 * non-standardized API shipped by Chrome/Edge/Samsung Internet).
 */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

/**
 * iOS never fires beforeinstallprompt, so it needs UA sniffing. iPadOS 13+
 * masquerades as macOS ("MacIntel" platform), but real Macs have no
 * touchscreen — maxTouchPoints > 1 disambiguates. Worst case the heuristic
 * misses and the dialog simply never shows (fails safe).
 */
export function isIosDevice(userAgent: string, platform: string, maxTouchPoints: number): boolean {
  if (/iPad|iPhone|iPod/.test(userAgent)) return true
  return platform === "MacIntel" && maxTouchPoints > 1
}

/** Whether the app is already running as an installed app. */
export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false
  if (window.matchMedia("(display-mode: standalone)").matches) return true
  // iOS Safari's pre-standard flag for home-screen launches.
  return "standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true
}

/** raw is the stored dismissal timestamp (ms since epoch) or null. */
export function isDismissedWithinCooldown(raw: string | null, now: number): boolean {
  if (!raw) return false
  const dismissedAt = Number(raw)
  if (!Number.isFinite(dismissedAt)) return false
  return now - dismissedAt < DISMISS_COOLDOWN_MS
}

// localStorage can throw (private mode, storage disabled) — same defensive
// pattern as hooks/use-recently-viewed.ts. A failed write just means the
// dialog may show again sooner; never user-facing.

export function markDismissed(): void {
  try {
    window.localStorage.setItem(PWA_DISMISSED_KEY, String(Date.now()))
  } catch {}
}

export function markInstalled(): void {
  try {
    window.localStorage.setItem(PWA_INSTALLED_KEY, "1")
  } catch {}
}

export function wasInstalled(): boolean {
  try {
    return window.localStorage.getItem(PWA_INSTALLED_KEY) === "1"
  } catch {
    return false
  }
}

export function getDismissedRaw(): string | null {
  try {
    return window.localStorage.getItem(PWA_DISMISSED_KEY)
  } catch {
    return null
  }
}
