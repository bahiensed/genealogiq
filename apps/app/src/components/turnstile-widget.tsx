"use client"

import { useEffect, useRef } from "react"

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: { sitekey: string; callback: (token: string) => void }
      ) => string
      reset: (widgetId?: string) => void
    }
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js"
let scriptPromise: Promise<void> | null = null

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Turnstile"))
    document.head.appendChild(script)
  })
  return scriptPromise
}

interface Props {
  onVerify: (token: string) => void
}

// Renders nothing (and never blocks submission) when NEXT_PUBLIC_TURNSTILE_SITE_KEY
// is unset — mirrors the graceful no-op fallback in lib/turnstile.ts's server-side
// verification, so local dev without keys still works.
export function TurnstileWidget({ onVerify }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  useEffect(() => {
    if (!siteKey || !containerRef.current) return
    let cancelled = false
    let widgetId: string | undefined

    loadTurnstileScript().then(() => {
      if (cancelled || !containerRef.current || !window.turnstile) return
      widgetId = window.turnstile.render(containerRef.current, { sitekey: siteKey, callback: onVerify })
    })

    return () => {
      cancelled = true
      if (widgetId && window.turnstile) window.turnstile.reset(widgetId)
    }
  }, [siteKey, onVerify])

  if (!siteKey) return null

  return <div ref={containerRef} />
}
