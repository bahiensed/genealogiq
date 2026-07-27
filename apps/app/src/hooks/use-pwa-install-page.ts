"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  type BeforeInstallPromptEvent,
  isIosDevice,
  isStandaloneDisplay,
  markDismissed,
  markInstalled,
} from "@/lib/pwa-install"

export type PwaInstallPageStatus = "checking" | "installed" | "native" | "ios" | "unsupported"

/** How long to wait for beforeinstallprompt before concluding "unsupported". */
const SETTLE_MS = 1500

/**
 * Drives the dedicated /install page. Unlike use-pwa-install.ts (the
 * auto-popup dialog), this ignores the 21-day/48h cooldown AND the "Don't ask
 * me again" opt-out entirely — landing on this page is the user's own
 * explicit request, not an ambient interruption, so neither should suppress
 * it. It also settles into an "unsupported" status instead of silently
 * rendering nothing, since a visitor who navigated here deserves feedback
 * even when one-tap install isn't available (Firefox, or a browser
 * beforeinstallprompt just hasn't fired for yet).
 */
export function usePwaInstallPage() {
  const [status, setStatus] = useState<PwaInstallPageStatus>("checking")
  const promptEvent = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (isStandaloneDisplay()) {
      setStatus("installed")
      return
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      promptEvent.current = event as BeforeInstallPromptEvent
      setStatus("native")
    }
    const onAppInstalled = () => {
      markInstalled()
      promptEvent.current = null
      setStatus("installed")
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)
    window.addEventListener("appinstalled", onAppInstalled)

    if (isIosDevice(navigator.userAgent, navigator.platform, navigator.maxTouchPoints)) {
      setStatus("ios")
    }

    // Only downgrades to "unsupported" if nothing more specific arrived by
    // then — a late beforeinstallprompt still wins if it fires after this.
    const timer = window.setTimeout(() => {
      setStatus((current) => (current === "checking" ? "unsupported" : current))
    }, SETTLE_MS)

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
      window.removeEventListener("appinstalled", onAppInstalled)
      window.clearTimeout(timer)
    }
  }, [])

  const install = useCallback(async () => {
    const event = promptEvent.current
    if (!event) return
    promptEvent.current = null
    await event.prompt()
    const { outcome } = await event.userChoice
    if (outcome === "accepted") {
      markInstalled()
      setStatus("installed")
    } else {
      // Mirrors the floating dialog's own decline bookkeeping — this page
      // doesn't gate on it, but other surfaces (the auto-popup) still should.
      markDismissed()
    }
  }, [])

  return { status, install }
}
