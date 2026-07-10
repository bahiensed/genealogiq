// Pure client-side helpers behind the push permission banner (see
// hooks/use-push-subscription.ts). DOM-free where possible so they unit-test
// in the node Vitest environment — same split as lib/pwa-install.ts.

export const PUSH_BANNER_DISMISSED_KEY = "giq:push-banner-dismissed"

/** How long "Not now" hides the banner. */
export const PUSH_DISMISS_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000

/**
 * PushManager.subscribe wants the VAPID public key as a Uint8Array; the key
 * ships as a base64url string. atob exists in browsers and Node ≥16.
 */
export function urlBase64ToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

/** raw is the stored dismissal timestamp (ms since epoch) or null. */
export function isDismissedWithinCooldown(raw: string | null, now: number): boolean {
  if (!raw) return false
  const dismissedAt = Number(raw)
  if (!Number.isFinite(dismissedAt)) return false
  return now - dismissedAt < PUSH_DISMISS_COOLDOWN_MS
}

/**
 * Web push needs all three APIs. Notably false in non-installed iOS Safari
 * tabs (no PushManager there) — which is exactly when the banner must hide.
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

// localStorage can throw (private mode) — same defensive pattern as
// lib/pwa-install.ts; a failed write only means the banner shows again.

export function markBannerDismissed(): void {
  try {
    window.localStorage.setItem(PUSH_BANNER_DISMISSED_KEY, String(Date.now()))
  } catch {}
}

export function getBannerDismissedRaw(): string | null {
  try {
    return window.localStorage.getItem(PUSH_BANNER_DISMISSED_KEY)
  } catch {
    return null
  }
}
