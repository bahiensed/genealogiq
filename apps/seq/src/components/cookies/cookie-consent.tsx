'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const COOKIE_NAME = 'cookie_consent'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

function getConsentCookie(): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function setConsentCookie(value: "all" | "essential") {
  document.cookie = `${COOKIE_NAME}=${value}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!getConsentCookie()) setVisible(true)
  }, [])

  if (!visible) return null

  function handleAcceptAll() {
    setConsentCookie("all")
    setVisible(false)
  }

  function handleEssentialOnly() {
    setConsentCookie("essential")
    setVisible(false)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-6 shadow-lg">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Oh dear! Here we go again...<br /><br />
          Yet another tiresome, legally complex, dubiously compliant, extravagantly
          expensive and relentlessly intrusive consent banner.<br /><br />
          Sorry for that, but we need to comply with global privacy regulations, formalize how we
          track your online behavior and keep our lawyers happy.<br /><br />
          <Link href="/privacy" className="underline underline-offset-4 hover:no-underline">
            Click here
          </Link>
          &nbsp;to learn more about our Privacy Policy.
        </p>
        <div className="flex flex-col shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={handleEssentialOnly}>
            Fine, but track me as little as possible
          </Button>
          <Button size="sm" onClick={handleAcceptAll}>
            OK, I accept all this legal nonsense
          </Button>
        </div>
      </div>
    </div>
  )
}
