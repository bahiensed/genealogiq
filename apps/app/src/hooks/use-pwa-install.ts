"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  type BeforeInstallPromptEvent,
  getDismissedRaw,
  getNeverAskAgain,
  isDismissedWithinCooldown,
  isIosDevice,
  isStandaloneDisplay,
  markDismissed,
  markInstalled,
  markNeverAskAgain,
  wasInstalled,
} from "@/lib/pwa-install"

/** Delay before the dialog opens, so it never competes with page load. */
const OPEN_DELAY_MS = 3000

/**
 * Drives the floating PWA install popup. Deliberately NOT shared with the
 * /home banner (see use-install-banner.ts) — the popup respects the 48h
 * dismiss cooldown and the permanent "Don't ask me again" opt-out; the
 * banner ignores both on purpose, so declining/opting out here must never
 * silence it.
 *
 * - "native": Chromium fired beforeinstallprompt — we can trigger the real
 *   install prompt. If the event fires before hydration it is missed for that
 *   page view — and it does NOT re-fire on App Router soft navigations, so
 *   the dialog only gets another chance on the next full page load (next
 *   visit/hard reload). Accepted.
 * - "ios": no programmatic install exists — the dialog shows Add-to-Home-Screen
 *   instructions instead. iOS also has no appinstalled event, so an installed
 *   iOS user browsing in Safari may see the dialog again after the dismissal
 *   cooldown. Accepted.
 * - null: already installed, dismissed within cooldown, opted out permanently
 *   ("Don't ask me again"), or the browser supports neither path (e.g.
 *   Firefox desktop) — render nothing.
 */
export function usePwaInstall() {
  const [mode, setMode] = useState<"native" | "ios" | null>(null)
  const [delayElapsed, setDelayElapsed] = useState(false)
  const [closed, setClosed] = useState(false)
  const [neverAskAgain, setNeverAskAgain] = useState(false)
  const promptEvent = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Self-heal: a launch from the real installed icon is the only moment we
    // can durably learn "this browser has it installed" — an install that
    // happened before this flag existed would otherwise never persist it,
    // and every later ordinary browser-tab visit would keep reading as "not
    // installed" and re-offering the dialog forever.
    if (isStandaloneDisplay()) markInstalled()

    // Whether the dialog may SHOW. The listeners attach regardless: the
    // beforeinstallprompt preventDefault() must run even during the dismissal
    // cooldown, or Chrome falls back to its own mini-infobar — the one UI we
    // promised to replace.
    const eligible =
      !isStandaloneDisplay() &&
      !wasInstalled() &&
      !getNeverAskAgain() &&
      !isDismissedWithinCooldown(getDismissedRaw(), Date.now())

    const onBeforeInstallPrompt = (event: Event) => {
      // Always suppress Chrome's mini-infobar; our dialog is the single UI.
      event.preventDefault()
      if (!eligible) return
      promptEvent.current = event as BeforeInstallPromptEvent
      setMode("native")
    }
    const onAppInstalled = () => {
      markInstalled()
      promptEvent.current = null
      setClosed(true)
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)
    window.addEventListener("appinstalled", onAppInstalled)

    if (eligible && isIosDevice(navigator.userAgent, navigator.platform, navigator.maxTouchPoints)) {
      setMode("ios")
    }

    const timer = window.setTimeout(() => setDelayElapsed(true), OPEN_DELAY_MS)

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
      window.removeEventListener("appinstalled", onAppInstalled)
      window.clearTimeout(timer)
    }
  }, [])

  const dismiss = useCallback(() => {
    if (neverAskAgain) markNeverAskAgain()
    else markDismissed()
    setClosed(true)
  }, [neverAskAgain])

  const install = useCallback(async () => {
    const event = promptEvent.current
    if (!event) return
    promptEvent.current = null
    await event.prompt()
    const { outcome } = await event.userChoice
    if (outcome === "accepted") {
      markInstalled()
    } else if (neverAskAgain) {
      // Checked "Don't ask me again" before declining the browser's own prompt.
      markNeverAskAgain()
    } else {
      // The user declined the browser's own prompt — same cooldown as Decline.
      markDismissed()
    }
    setClosed(true)
  }, [neverAskAgain])

  return {
    mode,
    open: delayElapsed && !closed && mode !== null,
    install,
    dismiss,
    neverAskAgain,
    setNeverAskAgain,
  }
}
