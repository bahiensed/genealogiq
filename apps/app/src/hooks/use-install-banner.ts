"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  type BeforeInstallPromptEvent,
  isIosDevice,
  isStandaloneDisplay,
  markInstalled,
  wasInstalled,
} from "@/lib/pwa-install"

/**
 * Drives the /home install banner — deliberately INDEPENDENT of the floating
 * popup's (usePwaInstall) 48h dismiss cooldown and "Don't ask me again"
 * opt-out. The two are meant to diverge on purpose: the popup is a modal
 * interruption the user can reasonably ask to back off from; the banner is a
 * quiet, inline nudge with no decline affordance of its own — it keeps
 * showing until the app is genuinely installed, regardless of what the user
 * chose in the popup.
 *
 * - "native": Chromium fired beforeinstallprompt — a real 1-tap install.
 * - "ios": no programmatic install exists — the banner links to /install
 *   for the Share steps instead.
 * - null: already installed (or running standalone), or the browser
 *   supports neither path — render nothing.
 */
export function useInstallBanner() {
  const [mode, setMode] = useState<"native" | "ios" | null>(null)
  const [visible, setVisible] = useState(false)
  const promptEvent = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (isStandaloneDisplay() || wasInstalled()) return

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      promptEvent.current = event as BeforeInstallPromptEvent
      setMode("native")
      setVisible(true)
    }
    const onAppInstalled = () => {
      markInstalled()
      promptEvent.current = null
      setVisible(false)
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)
    window.addEventListener("appinstalled", onAppInstalled)

    if (isIosDevice(navigator.userAgent, navigator.platform, navigator.maxTouchPoints)) {
      setMode("ios")
      setVisible(true)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
      window.removeEventListener("appinstalled", onAppInstalled)
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
      setVisible(false)
    }
    // Declining Chrome's own native prompt does not hide the banner or write
    // any cooldown flag — there is nothing here for it to silence.
  }, [])

  return { mode, open: visible, install }
}
