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

/** Default delay before the dialog opens, so it never competes with page load. */
const OPEN_DELAY_MS = 3000

/**
 * Drives the PWA install prompt — the floating popup (default) and the /home
 * banner (`delayMs: 0`) share this: same eligibility (cooldown/opt-out),
 * same listeners, same install()/dismiss() bookkeeping. Only the popup needs
 * an entrance delay (a modal popping in immediately would compete with page
 * load); the banner is a passive, non-blocking element, so it shows as soon
 * as eligibility + the browser's event resolve, same as PushBanner.
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
export function usePwaInstall(opts?: { delayMs?: number }) {
  const delayMs = opts?.delayMs ?? OPEN_DELAY_MS
  const [mode, setMode] = useState<"native" | "ios" | null>(null)
  const [delayElapsed, setDelayElapsed] = useState(delayMs === 0)
  const [closed, setClosed] = useState(false)
  const [neverAskAgain, setNeverAskAgain] = useState(false)
  const promptEvent = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
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

    // delayMs === 0 (the banner): delayElapsed already starts true, no timer needed.
    const timer = delayMs > 0 ? window.setTimeout(() => setDelayElapsed(true), delayMs) : undefined

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
      window.removeEventListener("appinstalled", onAppInstalled)
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [delayMs])

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
