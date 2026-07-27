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

// How long to wait for beforeinstallprompt before concluding "unsupported".
// Generous on purpose: on a genuinely first-ever visit (cold HTTP cache),
// Chrome only dispatches this event once our service worker reaches
// "activated" — which itself waits on its install-phase precache (~13 files,
// including a couple ~140KB images) to finish downloading. 1.5s reliably
// wasn't enough real-world time for that on a fresh machine/connection,
// which produced a false "unsupported" moments before the real event
// arrived (the listener below still upgrades a late event to "native" — see
// its comment — but showing the wrong terminal state even briefly reads as
// broken, so the goal here is to not need that rescue in the first place).
// Bumped from 5s to 10s: production testing showed 5s still wasn't always
// enough (slower connections/devices need more time for the precache above
// to finish before Chrome fires the event).
const SETTLE_MS = 10000

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
