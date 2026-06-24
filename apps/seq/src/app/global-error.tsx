"use client"

import { useEffect } from "react"
import { captureBoundaryError } from "@/lib/observability"

// Replaces the root layout when the root layout/template itself throws, so it runs
// ABOVE all providers (no next-intl, no theme): text stays hardcoded, styles inline.
export default function GlobalError({
  error,
  reset,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  reset?: () => void
  unstable_retry?: () => void
}) {
  useEffect(() => {
    captureBoundaryError(error)
  }, [error])

  const retry = unstable_retry ?? reset

  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 16,
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <title>Something went wrong</title>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Something went wrong</h1>
        <p style={{ color: "#6b7280", margin: 0 }}>
          An unexpected error occurred. Please reload the page.
        </p>
        {retry && (
          <button
            onClick={() => retry()}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        )}
      </body>
    </html>
  )
}
