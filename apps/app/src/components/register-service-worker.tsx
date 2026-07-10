"use client"

import { useEffect } from "react"

// Hand-rolled registration (no next-pwa/serwist): this app's Next.js config
// defaults to Turbopack, which the current PWA build-plugin ecosystem doesn't
// support — see public/sw.js for the equivalent hand-written service worker.
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    if (process.env.NODE_ENV !== "production") {
      // In dev the SW's caching only gets in the way (stale chunks, confusing
      // HMR). Also unregister anything left over from a previous prod build
      // served on this origin, so developers aren't stuck behind it.
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => registrations.forEach((r) => r.unregister()))
        .catch(() => {})
      return
    }

    // updateViaCache: "none" makes the browser always revalidate sw.js itself,
    // so a new deploy's worker is picked up promptly.
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {
      // Installability is a progressive enhancement — a failed registration
      // (unsupported browser, blocked by extension, etc.) shouldn't be user-facing.
    })
  }, [])

  return null
}
