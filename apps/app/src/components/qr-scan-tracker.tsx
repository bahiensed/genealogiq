'use client'

import { useEffect } from "react"

export function QrScanTracker({ profileId }: { profileId: string }) {
  useEffect(() => {
    fetch("/api/analytics/qr-scan", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ profileId }),
    }).catch(() => {
      // Fire-and-forget — swallow errors silently
    })
    // profileId is stable per page load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId])

  return null
}
