"use client"

import { useEffect } from "react"

// Hand-rolled registration (no next-pwa/serwist): this app's Next.js config
// defaults to Turbopack, which the current PWA build-plugin ecosystem doesn't
// support — see public/sw.js for the equivalent hand-written service worker.
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability is a progressive enhancement — a failed registration
      // (unsupported browser, blocked by extension, etc.) shouldn't be user-facing.
    })
  }, [])

  return null
}
