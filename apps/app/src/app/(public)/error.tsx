"use client"

import { useEffect } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { captureBoundaryError } from "@/lib/observability"

// Contextual boundary for the public (memorial) area: errors inside a profile page
// render here, keeping the (public)/layout.tsx chrome (header) intact. A generic
// message only — never the raw error — with the digest reported for correlation.
export default function Error({
  error,
  reset,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  reset?: () => void
  unstable_retry?: () => void
}) {
  const t = useTranslations("Errors")

  useEffect(() => {
    captureBoundaryError(error)
  }, [error])

  const retry = unstable_retry ?? reset

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 pt-24 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      {retry && <Button onClick={() => retry()}>{t("retry")}</Button>}
    </div>
  )
}
